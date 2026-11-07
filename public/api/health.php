<?php
declare(strict_types=1);

require_once __DIR__ . '/../../server/bootstrap.php';

$config = load_config();
$dbConnected = false;
$dbError = null;

try {
    $pdo = get_db_connection();
    $pdo->query('SELECT 1');
    $dbConnected = true;
} catch (Throwable $e) {
    $dbConnected = false;
    $dbError = $e->getMessage();
}

$aiConfig = $config['ollama'] ?? [];
$baseUrl = rtrim((string)($aiConfig['base_url'] ?? 'http://127.0.0.1:11434/api'), '/');
$configuredModel = (string)($aiConfig['model'] ?? '');
$aiConnected = false;
$aiError = null;
$availableModels = [];

if ($baseUrl !== '') {
    $ch = curl_init($baseUrl . '/tags');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 2,
        CURLOPT_CONNECTTIMEOUT => 1,
    ]);
    $res = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($res !== false && $curlErr === '') {
        $tagsData = json_decode($res, true);
        if (is_array($tagsData) && isset($tagsData['models'])) {
            $aiConnected = true;
            foreach ($tagsData['models'] as $m) {
                if (isset($m['name'])) {
                    $availableModels[] = (string)$m['name'];
                }
            }
        }
    } else {
        $aiError = $curlErr ?: 'Không thể kết nối dịch vụ Ollama.';
    }
}

$isReady = $dbConnected;

json_response([
    'ok' => true,
    'data' => [
        'status' => $isReady ? 'ready' : 'setup_required',
        'database_checked' => true,
        'database_connected' => $dbConnected,
        'database_error' => $dbError,
        'ai_checked' => true,
        'ai_available' => $aiConnected,
        'ai_error' => $aiError,
        'ai_configured_model' => $configuredModel,
        'ai_available_models' => $availableModels,
        'auth_implemented' => true,
        'sync_implemented' => true,
        'snapshot_implemented' => true,
        'chat_implemented' => true,
        'server_time' => gmdate('Y-m-d\TH:i:s\Z'),
    ],
]);
