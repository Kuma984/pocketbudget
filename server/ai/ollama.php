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
        throw new PocketBudgetAiError('AI_UNAVAILABLE', 503, 'Không gọi được Ollama. Kiểm tra dịch vụ đang chạy và đã tải đúng model local.');
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
