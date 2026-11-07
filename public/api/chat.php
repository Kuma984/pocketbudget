<?php
declare(strict_types=1);

require_once __DIR__ . '/../../server/bootstrap.php';

$userId = require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('METHOD_NOT_ALLOWED', 'Chat yêu cầu phương thức POST.', 405);
}

verify_csrf_token();

$input = get_json_input();
$message = trim((string)($input['message'] ?? ''));
$context = (array)($input['context'] ?? []);

if ($message === '') {
    json_error('VALIDATION_ERROR', 'Tin nhắn không được để trống.');
}

$config = load_config();
$ollamaConfig = $config['ollama'] ?? [];
$baseUrl = rtrim((string)($ollamaConfig['base_url'] ?? 'http://127.0.0.1:11434/api'), '/');
$model = (string)($ollamaConfig['model'] ?? '');
$timeoutSeconds = (int)($ollamaConfig['timeout_seconds'] ?? 30);

if ($model === '' || $model === 'CHANGE_ME_LOCAL_MODEL') {
    json_error('AI_NOT_CONFIGURED', 'Chưa cấu hình model Ollama trong server/config.local.php. Vui lòng cấu hình model local (ví dụ: qwen2.5:3b, llama3.2).', 503);
}

// Đọc system prompt và schema
$systemPromptFile = __DIR__ . '/../../server/ai/system-prompt.md';
$systemPrompt = file_exists($systemPromptFile) ? file_get_contents($systemPromptFile) : '';

$schemaFile = __DIR__ . '/../../server/ai/response-schema.json';
$schemaContent = file_exists($schemaFile) ? file_get_contents($schemaFile) : '';
$schemaJson = json_decode($schemaContent, true);

// Xây dựng bối cảnh tài chính an toàn, không chứa thông tin nhạy cảm
$cleanContext = [
    'as_of' => date('Y-m-d H:i:s'),
    'current_balance_vnd' => (int)($context['balance_vnd'] ?? 0),
    'budget_remaining_vnd' => (int)($context['budget_remaining_vnd'] ?? 0),
    'current_month' => (string)($context['current_month'] ?? date('Y-m')),
    'pending_operations_count' => (int)($context['pending_count'] ?? 0),
    'recent_summary' => is_array($context['summary'] ?? null) ? $context['summary'] : [],
];

$fullSystemPrompt = $systemPrompt . "\n\n" .
    "DỮ LIỆU TÀI CHÍNH CỦA NGƯỜI DÙNG HIỆN TẠI (CHỈ THAM KHẢO, KHÔNG ĐƯỢC TỰ BỊA ĐẶT):\n" .
    json_encode($cleanContext, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n\n" .
    "BẮT BUỘC: Bạn PHẢI trả về duy nhất một chuỗi JSON hợp lệ tuân thủ chặt chẽ schema sau:\n" .
    $schemaContent . "\n" .
    "Tuyệt đối không kèm bất kỳ giải thích nào ngoài chuỗi JSON.";

// Gửi yêu cầu sang Ollama /api/chat
$payload = [
    'model' => $model,
    'messages' => [
        ['role' => 'system', 'content' => $fullSystemPrompt],
        ['role' => 'user', 'content' => $message],
    ],
    'format' => 'json',
    'stream' => false,
    'options' => [
        'temperature' => 0.2, // Giảm tính ngẫu nhiên để tuân thủ schema tốt hơn
    ],
];

$ch = curl_init($baseUrl . '/chat');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => $timeoutSeconds,
    CURLOPT_CONNECTTIMEOUT => 5,
]);

$rawResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($rawResponse === false || $curlError !== '') {
    json_error('AI_UNAVAILABLE', 'Không thể kết nối đến dịch vụ Ollama cục bộ (' . ($curlError ?: 'Lỗi kết nối') . '). Hãy đảm bảo Ollama đang chạy trên máy.', 503);
}

if ($httpCode !== 200) {
    json_error('AI_ERROR', "Dịch vụ Ollama trả về mã lỗi HTTP {$httpCode}: " . mb_substr($rawResponse, 0, 300), 502);
}

$ollamaData = json_decode($rawResponse, true);
$assistantContent = $ollamaData['message']['content'] ?? '';

// Parse nội dung JSON được sinh ra bởi Model
$parsedData = null;
try {
    $parsedData = json_decode($assistantContent, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable) {
    // Nếu model trả JSON bọc trong markdown code fence
    if (preg_match('/```(?:json)?\s*(\{[\s\S]*?\})\s*```/', $assistantContent, $matches)) {
        try {
            $parsedData = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            $parsedData = null;
        }
    }
}

if (!is_array($parsedData) || empty($parsedData['intent'])) {
    // Fallback an toàn nếu LLM sinh sai format
    json_response([
        'ok' => true,
        'data' => [
            'intent' => 'unsupported',
            'reply' => $assistantContent !== '' ? $assistantContent : 'Xin lỗi, tôi chưa hiểu rõ yêu cầu hoặc câu trả lời không đúng định dạng. Bạn có thể hỏi về thống kê chi tiêu, thử mô phỏng một khoản mua sắm hoặc nhờ tạo bản nháp thu chi.',
        ],
    ]);
}

// Whitelist intents
$validIntents = ['expense_summary', 'simulate_purchase', 'draft_transaction', 'unsupported'];
$intent = (string)$parsedData['intent'];
if (!in_array($intent, $validIntents, true)) {
    $intent = 'unsupported';
    $parsedData['intent'] = 'unsupported';
}

// Kiểm tra và chuẩn hóa dữ liệu theo intent
if ($intent === 'draft_transaction') {
    $draft = is_array($parsedData['draft'] ?? null) ? $parsedData['draft'] : [];
    $missing = is_array($parsedData['missing_fields'] ?? null) ? $parsedData['missing_fields'] : [];

    // Kiểm tra type
    if (!empty($draft['type']) && !in_array($draft['type'], ['income', 'expense', 'transfer'], true)) {
        unset($draft['type']);
        $missing[] = 'type';
    }

    // Kiểm tra amount_vnd
    if (isset($draft['amount_vnd'])) {
        $amount = (int)$draft['amount_vnd'];
        if ($amount <= 0 || $amount > 9007199254740991) {
            unset($draft['amount_vnd']);
            $missing[] = 'amount_vnd';
        } else {
            $draft['amount_vnd'] = $amount;
        }
    } else {
        $missing[] = 'amount_vnd';
    }

    // Kiểm tra date
    if (!empty($draft['occurred_on']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$draft['occurred_on'])) {
        unset($draft['occurred_on']);
        $missing[] = 'occurred_on';
    }

    $parsedData['draft'] = $draft;
    $parsedData['missing_fields'] = array_values(array_unique($missing));
} elseif ($intent === 'simulate_purchase') {
    if (isset($parsedData['price_vnd'])) {
        $parsedData['price_vnd'] = max(1, min((int)$parsedData['price_vnd'], 9007199254740991));
    }
}

json_response([
    'ok' => true,
    'data' => $parsedData,
]);
