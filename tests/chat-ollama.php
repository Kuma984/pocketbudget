<?php
declare(strict_types=1);
// Kiểm tra đường đi tới Ollama bằng một Ollama giả lập trên localhost. Không kiểm tra độ chính xác của model thật.
require_once __DIR__ . '/../server/ai/ollama.php';

$port = 18000 + random_int(0, 999);
$router = tempnam(sys_get_temp_dir(), 'ollama');
$log = $router . '.log';
file_put_contents($router, <<<'PHP'
<?php
$body = file_get_contents('php://input');
file_put_contents(getenv('OLLAMA_LOG'), $body);
$req = json_decode($body, true);
if (($req['model'] ?? '') === 'missing-model') { http_response_code(404); echo '{"error":"model not found"}'; return; }
if (($req['model'] ?? '') === 'broken-model') { echo json_encode(['message' => ['content' => '{"intent":"drop_database"}']]); return; }
header('Content-Type: application/json');
echo json_encode(['message' => ['content' => getenv('OLLAMA_REPLY')]]);
PHP);
$reply = '{"intent":"balance","wallet_scope":"named","wallet_name":"Tiền mặt"}';
// Chạy được trên Windows (XAMPP) và Linux: dùng đúng php đang chạy test, thiết bị rỗng của từng hệ điều hành,
// và giữ biến môi trường sẵn có (Windows cần SYSTEMROOT để mở socket).
$null = PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null';
$env = array_merge(getenv(), ['OLLAMA_LOG' => $log, 'OLLAMA_REPLY' => $reply]);
$proc = proc_open([PHP_BINARY, '-S', "127.0.0.1:$port", $router], [1 => ['file', $null, 'w'], 2 => ['file', $null, 'w']], $pipes, null, $env);
if (!is_resource($proc)) {
    throw new RuntimeException('Không khởi động được Ollama giả lập bằng ' . PHP_BINARY);
}
// Chờ tối đa 10 giây cho server giả lập nghe ở cổng, thay vì đợi một khoảng cố định.
$ready = false;
for ($i = 0; $i < 100 && !$ready; $i++) {
    $socket = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
    if ($socket) { fclose($socket); $ready = true; } else { usleep(100000); }
}
if (!$ready) {
    proc_terminate($proc);
    throw new RuntimeException("Ollama giả lập không nghe ở cổng $port.");
}
$fail = static function (string $m) use ($proc) { proc_terminate($proc); throw new RuntimeException($m); };
$config = ['base_url' => "http://127.0.0.1:$port/api", 'model' => 'qwen2.5:7b', 'timeout_seconds' => 5];

try {
    // 1. Kết quả hợp lệ đi qua kiểm tra; lịch sử được gửi thành các lượt user/assistant trước câu hiện tại.
    $history = pb_ai_history(json_decode('[{"message":"Tôi còn bao nhiêu tiền?","result":{"intent":"balance","wallet_scope":"all"}}]'));
    $result = pb_ai_classify($config, 'Còn ví Tiền mặt?', '2026-11-08', $history);
    if ($result !== ['intent' => 'balance', 'wallet_scope' => 'named', 'wallet_name' => 'Tiền mặt', 'as_of' => 'current']) $fail('Unexpected classify result.');
    $sent = json_decode(file_get_contents($log), true);
    $roles = array_column($sent['messages'], 'role');
    if ($roles !== ['system', 'user', 'assistant', 'user'] || $sent['messages'][3]['content'] !== 'Còn ví Tiền mặt?'
        || !str_contains($sent['messages'][2]['content'], '"wallet_scope":"all"')
        || !str_contains($sent['messages'][0]['content'], 'Ngày địa phương: 2026-11-08')
        || $sent['format']['properties']['intent']['enum'][0] !== 'balance') $fail('Unexpected request to Ollama.');

    // 2. Model trả ý định ngoài danh sách → bị chặn, không được đoán thay.
    try { pb_ai_classify(['model' => 'broken-model'] + $config, 'x', '2026-11-08'); $fail('Invalid model output accepted.'); }
    catch (PocketBudgetAiError $e) { if ($e->errorCode !== 'AI_OUTPUT_INVALID') $fail('Wrong error for invalid output.'); }

    // 3. Model chưa tải → lỗi rõ ràng.
    try { pb_ai_classify(['model' => 'missing-model'] + $config, 'x', '2026-11-08'); $fail('Missing model not reported.'); }
    catch (PocketBudgetAiError $e) { if ($e->errorCode !== 'AI_MODEL_MISSING' || $e->status !== 503) $fail('Wrong error for missing model.'); }
} finally {
    proc_terminate($proc);
}

// 4. Ollama tắt (không có gì nghe ở cổng) → báo lỗi, KHÔNG trả kết quả đoán bằng từ khóa.
try {
    pb_ai_classify(['base_url' => 'http://127.0.0.1:' . ($port + 1) . '/api'] + $config, 'Tháng này tôi đã chi bao nhiêu?', '2026-11-08');
    throw new RuntimeException('Offline Ollama returned a result.');
} catch (PocketBudgetAiError $e) {
    if ($e->errorCode !== 'AI_UNAVAILABLE' || $e->status !== 503 || !str_contains($e->getMessage(), 'Ollama')) {
        throw new RuntimeException('Wrong error for offline Ollama.');
    }
}
@unlink($router); @unlink($log);
echo "PASS chat Ollama connector (mock)\n";
