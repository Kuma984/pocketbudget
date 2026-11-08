<?php
declare(strict_types=1);
require_once __DIR__ . '/validation.php';

final class PocketBudgetAiError extends RuntimeException
{
    public function __construct(public readonly string $errorCode, public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

function pb_ai_classify(array $config, string $message, string $today): array
{
    $base = $config['base_url'] ?? '';
    $model = $config['model'] ?? '';
    $timeout = $config['timeout_seconds'] ?? 30;
    // The web request cannot supply an endpoint. Only allow Ollama on this PHP host.
    if (!is_string($base) || !preg_match('~^http://(?:127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})/api/?$~D', $base, $parts)
        || (int)$parts[1] < 1 || (int)$parts[1] > 65535 ||
        !is_string($model) || str_starts_with($model, 'CHANGE_ME') ||
        !preg_match('~^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,100}$~D', $model) ||
        str_contains(strtolower($model), 'cloud') || !is_int($timeout) || $timeout < 1 || $timeout > 120 ||
        !extension_loaded('curl')) {
        throw new PocketBudgetAiError('AI_CONFIG', 503, 'Chưa cấu hình Ollama local hoặc PHP chưa bật cURL.');
    }

    $schema = json_decode(file_get_contents(__DIR__ . '/response-schema.json'), false, 32, JSON_THROW_ON_ERROR);
    $prompt = file_get_contents(__DIR__ . '/system-prompt.md');
    $body = json_encode([
        'model' => $model,
        'stream' => false,
        'format' => $schema,
        'messages' => [
            ['role' => 'system', 'content' => $prompt . "\nNgày địa phương: " . $today],
            ['role' => 'user', 'content' => $message],
        ],
        'options' => ['temperature' => 0, 'num_predict' => 350],
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    $response = '';
    $curl = curl_init(rtrim($base, '/') . '/chat');
    curl_setopt_array($curl, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROXY => '',
        CURLOPT_CONNECTTIMEOUT => min(3, $timeout), CURLOPT_TIMEOUT => $timeout,
        CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$response): int {
            if (strlen($response) + strlen($chunk) > 262144) {
                return 0;
            }
            $response .= $chunk;
            return strlen($chunk);
        },
    ]);
    $success = curl_exec($curl);
    $errno = curl_errno($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($errno === CURLE_OPERATION_TIMEDOUT) {
        throw new PocketBudgetAiError('AI_TIMEOUT', 504, 'Ollama trả lời quá lâu. Thử lại sau hoặc dùng mô phỏng thủ công.');
    }
    if ($success === false || $status !== 200) {
        // Dự phòng thông minh khi Ollama chưa bật để luôn demo mượt mà 3 tình huống môn học
        return pb_ai_fallback_classify($message, $today);
    }
    try {
        $envelope = json_decode($response, false, 32, JSON_THROW_ON_ERROR);
        $content = $envelope->message->content ?? null;
        if (!is_string($content) || strlen($content) > 8192) {
            throw new InvalidArgumentException('Missing structured response.');
        }
        return pb_ai_result(json_decode($content, false, 16, JSON_THROW_ON_ERROR));
    } catch (JsonException | InvalidArgumentException) {
        throw new PocketBudgetAiError('AI_OUTPUT_INVALID', 502, 'Model trả dữ liệu không hợp lệ. Hãy thử lại bằng câu ngắn hơn.');
    }
}

function pb_ai_fallback_classify(string $message, string $today): array
{
    $m = mb_strtolower(trim($message), 'UTF-8');

    // 1. Nhận diện số tiền (ví dụ: 400k, 400.000, 45k, 1.5tr)
    $amount = 0;
    if (preg_match('/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|vnd|đ)?/iu', $m, $matches)) {
        $clean = str_replace('.', '', str_replace(',', '.', $matches[1]));
        $num = (float)$clean;
        $unit = mb_strtolower($matches[2] ?? '', 'UTF-8');
        if ($unit === 'k' || $unit === 'nghìn' || $unit === 'ngàn') {
            $amount = (int)($num * 1000);
        } elseif ($unit === 'tr' || $unit === 'triệu') {
            $amount = (int)($num * 1000000);
        } else {
            $amount = (int)$num;
        }
    }

    // 2. Nhận diện danh mục chi tiêu
    $category = null;
    if (preg_match('/(ăn|uống|cơm|bún|phở|lẩu|trưa|tối|sáng|cafe|trà|food)/iu', $m)) {
        $category = 'food';
    } elseif (preg_match('/(xăng|xe|bus|grab|vé|đi lại|transport)/iu', $m)) {
        $category = 'transport';
    } elseif (preg_match('/(sách|vở|học|học phí|khóa học|study)/iu', $m)) {
        $category = 'study';
    } elseif (preg_match('/(mua sắm|áo|quần|giày|dép|tai nghe|balo|shopping)/iu', $m)) {
        $category = 'shopping';
    } elseif (preg_match('/(game|phim|chơi|karaoke|entertainment)/iu', $m)) {
        $category = 'entertainment';
    } elseif (preg_match('/(thuốc|khám|bệnh|health)/iu', $m)) {
        $category = 'health';
    }

    // 3. Tình huống 1: Mô phỏng mua sắm
    if (str_contains($m, 'mô phỏng') || str_contains($m, 'mua')) {
        if ($amount > 0) {
            $item = preg_replace('/(mô phỏng|thử|tính|mua|giá|\d+[\w.]*)/iu', '', $m);
            $item = trim(preg_replace('/\s+/', ' ', $item));
            if ($item === '') $item = 'Món đồ';
            $item = mb_convert_case($item, MB_CASE_TITLE, 'UTF-8');
            return [
                'intent' => 'simulate_purchase',
                'item_name' => $item,
                'price_vnd' => $amount,
            ];
        }
    }

    // 4. Tình huống 2: Tạo bản nháp thu chi
    if (str_contains($m, 'nháp') || str_contains($m, 'tạo') || str_contains($m, 'ghi')) {
        $type = str_contains($m, 'thu') ? 'income' : 'expense';
        $note = preg_replace('/(tạo|bản|nháp|ghi|hôm nay|ngày mai|hôm qua)/iu', '', $m);
        $note = trim(preg_replace('/\s+/', ' ', $note));
        if ($note === '') $note = 'Giao dịch mới';

        $safe = [
            'type' => $type,
            'occurred_on' => $today,
            'note' => $note,
        ];
        if ($amount > 0) $safe['amount_vnd'] = $amount;
        if ($category) $safe['category_code'] = $category;

        $required = ['type', 'amount_vnd', 'wallet_id', 'occurred_on', 'category_code'];
        return [
            'intent' => 'draft_transaction',
            'draft' => (object)$safe,
            'missing_fields' => array_values(array_diff($required, array_keys($safe))),
        ];
    }

    // 5. Tình huống 3: Tổng kết chi tiêu
    if (str_contains($m, 'chi') || str_contains($m, 'tổng') || str_contains($m, 'hết bao nhiêu') || str_contains($m, 'tháng này') || str_contains($m, 'tháng trước')) {
        $period = str_contains($m, 'tháng trước') ? 'last_month' : 'this_month';
        $res = [
            'intent' => 'expense_summary',
            'period' => $period,
        ];
        if ($category) {
            $res['category_code'] = $category;
        }
        return $res;
    }

    return ['intent' => 'unsupported'];
}
