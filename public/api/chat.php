<?php
declare(strict_types=1);
require_once __DIR__ . '/../../server/bootstrap.php';
require_once __DIR__ . '/../../server/ai/ollama.php';

function pb_chat_error(int $status, string $code, string $message): void
{
    json_response(['ok' => false, 'error' => ['code' => $code, 'message' => $message]], $status);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    pb_chat_error(405, 'METHOD_NOT_ALLOWED', 'Dùng POST cho API chatbot.');
}
require_login();
verify_csrf_token();
session_write_close();

$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($contentType !== 'application/json') {
    pb_chat_error(415, 'EXPECTED_JSON', 'Chatbot chỉ nhận JSON.');
}
try {
    $body = file_get_contents('php://input', false, null, 0, 8193);
    if ($body === false || strlen($body) > 8192) {
        pb_chat_error(413, 'REQUEST_TOO_LARGE', 'Câu hỏi quá dài.');
    }
    $data = pb_ai_object(json_decode($body, false, 16, JSON_THROW_ON_ERROR));
    pb_ai_keys($data, ['message', 'context']);
    $message = pb_ai_text($data['message'] ?? null, 500);
    $context = pb_ai_object($data['context'] ?? new stdClass());
    pb_ai_keys($context, ['today', 'as_of', 'pending_count']);
    $today = pb_ai_date($context['today'] ?? (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d'));
} catch (InvalidArgumentException | JsonException) {
    pb_chat_error(422, 'INVALID_INPUT', 'Câu hỏi hoặc ngày không hợp lệ.');
}

try {
    $config = load_config();
    $ollama = $config['ollama'] ?? [];
    json_response(['ok' => true, 'data' => pb_ai_classify($ollama, $message, $today)]);
} catch (PocketBudgetAiError $error) {
    pb_chat_error($error->status, $error->errorCode, $error->getMessage());
} catch (Throwable) {
    pb_chat_error(500, 'AI_INTERNAL', 'Chatbot chưa xử lý được yêu cầu.');
}
