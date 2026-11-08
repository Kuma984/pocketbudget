<?php
declare(strict_types=1);
require_once __DIR__ . '/../../server/bootstrap.php';
require_once __DIR__ . '/../../server/sync-records.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(['ok' => false, 'error' => ['message' => 'Đồng bộ yêu cầu POST.']], 405);
}
$userId = require_login();
verify_csrf_token();
session_write_close();
$operations = get_json_input()['operations'] ?? null;
if (!is_array($operations) || !array_is_list($operations) || count($operations) > 50) {
    json_response(['ok' => false, 'error' => ['message' => 'Danh sách thao tác không hợp lệ.']], 422);
}
$pdo = get_db();
$results = [];
foreach ($operations as $op) {
    $opId = is_array($op) && is_string($op['operation_id'] ?? null) ? $op['operation_id'] : '';
    try {
        if (!is_array($op)) throw new InvalidArgumentException('Thao tác không hợp lệ.');
        $results[] = pb_sync_apply($pdo, $userId, $op);
    } catch (InvalidArgumentException $error) {
        $results[] = ['operation_id' => $opId, 'ok' => false, 'error' => ['code' => 'VALIDATION_ERROR', 'message' => $error->getMessage()]];
    } catch (Throwable) {
        $results[] = ['operation_id' => $opId, 'ok' => false, 'error' => ['code' => 'SYNC_FAILED', 'message' => 'Máy chủ chưa lưu được thao tác.']];
    }
}
json_response(['ok' => true, 'data' => ['results' => $results]]);
