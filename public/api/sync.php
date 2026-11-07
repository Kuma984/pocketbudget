<?php
declare(strict_types=1);

require_once __DIR__ . '/../../server/bootstrap.php';

// Bắt buộc phải đăng nhập mới được đồng bộ
$userId = require_login();
$pdo = get_db();

$input = get_json_input();
$operations = $input['operations'] ?? [];
$results = [];

foreach ($operations as $op) {
    $opId = (string)($op['operation_id'] ?? '');
    if ($opId === '') {
        continue;
    }

    // 1. Chống trùng lặp (Idempotency): Nếu thao tác này đã từng được lưu, trả lại kết quả cũ
    $checkStmt = $pdo->prepare('SELECT result_json FROM processed_operations WHERE user_id = ? AND operation_id = ?');
    $checkStmt->execute([$userId, $opId]);
    $existingReceipt = $checkStmt->fetch();

    if ($existingReceipt) {
        $results[] = json_decode((string)$existingReceipt['result_json'], true);
        continue;
    }

    $entity = $op['entity'] ?? '';
    $action = $op['action'] ?? '';
    $record = $op['record'] ?? [];
    $entityId = (string)($record['id'] ?? $op['entity_id'] ?? '');

    $opResult = ['operation_id' => $opId, 'ok' => true, 'record' => ['id' => $entityId, 'version' => 1]];

    try {
        // 2. Xử lý VÍ TIỀN (WALLET)
        if ($entity === 'wallet') {
            if ($action === 'delete') {
                $stmt = $pdo->prepare('UPDATE wallets SET deleted_at = NOW(6) WHERE id = ? AND user_id = ?');
                $stmt->execute([$entityId, $userId]);
            } else {
                $name = $record['name'] ?? 'Ví mới';
                $balance = (int)($record['opening_balance_vnd'] ?? 0);

                // Kiểm tra xem ví đã có trong DB chưa
                $find = $pdo->prepare('SELECT id FROM wallets WHERE id = ? AND user_id = ?');
                $find->execute([$entityId, $userId]);

                if ($find->fetch()) {
                    $stmt = $pdo->prepare('UPDATE wallets SET name = ?, opening_balance_vnd = ?, deleted_at = NULL WHERE id = ? AND user_id = ?');
                    $stmt->execute([$name, $balance, $entityId, $userId]);
                } else {
                    $stmt = $pdo->prepare('INSERT INTO wallets (id, user_id, name, opening_balance_vnd, version) VALUES (?, ?, ?, ?, 1)');
                    $stmt->execute([$entityId, $userId, $name, $balance]);
                }
            }
        }

        // 3. Xử lý GIAO DỊCH (TRANSACTION)
        if ($entity === 'transaction') {
            if ($action === 'delete') {
                $stmt = $pdo->prepare('UPDATE transactions SET deleted_at = NOW(6) WHERE id = ? AND user_id = ?');
                $stmt->execute([$entityId, $userId]);
            } else {
                $walletId = $record['wallet_id'] ?? '';
                $destWalletId = $record['destination_wallet_id'] ?? null;
                $type = $record['type'] ?? 'expense';
                $amount = (int)($record['amount_vnd'] ?? 0);
                $category = $record['category_code'] ?? null;
                $date = $record['occurred_on'] ?? date('Y-m-d');
                $note = $record['note'] ?? '';

                // Nếu là chuyển ví thì không có category
                if ($type === 'transfer') {
                    $category = null;
                } else {
                    $destWalletId = null;
                }

                $find = $pdo->prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?');
                $find->execute([$entityId, $userId]);

                if ($find->fetch()) {
                    $stmt = $pdo->prepare('UPDATE transactions SET wallet_id = ?, destination_wallet_id = ?, type = ?, amount_vnd = ?, category_code = ?, occurred_on = ?, note = ?, deleted_at = NULL WHERE id = ? AND user_id = ?');
                    $stmt->execute([$walletId, $destWalletId, $type, $amount, $category, $date, $note, $entityId, $userId]);
                } else {
                    $stmt = $pdo->prepare('INSERT INTO transactions (id, user_id, wallet_id, destination_wallet_id, type, amount_vnd, category_code, occurred_on, note, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
                    $stmt->execute([$entityId, $userId, $walletId, $destWalletId, $type, $amount, $category, $date, $note]);
                }
            }
        }

        // 4. Lưu biên lai để lần sau client gửi lại sẽ không bị trùng
        $saveReceipt = $pdo->prepare('INSERT INTO processed_operations (user_id, operation_id, result_json, processed_at) VALUES (?, ?, ?, NOW(6))');
        $saveReceipt->execute([$userId, $opId, json_encode($opResult, JSON_UNESCAPED_UNICODE)]);

    } catch (Throwable $e) {
        $opResult = [
            'operation_id' => $opId,
            'ok' => false,
            'error' => ['message' => $e->getMessage()]
        ];
    }

    $results[] = $opResult;
}

json_response([
    'ok' => true,
    'data' => [
        'results' => $results
    ]
]);
