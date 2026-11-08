<?php
declare(strict_types=1);
// CLI-only smoke test of the real Ollama connector; never placed under public/.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/../server/ai/ollama.php';

try {
    $message = pb_ai_text($argv[1] ?? null, 500);
    $path = __DIR__ . '/../server/config.local.php';
    if (!is_file($path)) {
        throw new RuntimeException('Copy server/config.example.php to server/config.local.php first.');
    }
    $config = require $path;
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
    $result = pb_ai_classify($config['ollama'] ?? [], $message, $today);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR), PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Chat test failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
