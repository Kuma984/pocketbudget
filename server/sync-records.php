<?php
declare(strict_types=1);
require_once __DIR__ . '/ai/validation.php';

const PB_SYNC_TABLES = ['wallet' => 'wallets', 'transaction' => 'transactions', 'budget' => 'budgets', 'wishlist' => 'wishlist'];

function pb_sync_id(mixed $value): string {
    if (!is_string($value) || !preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/Di', $value)) {
        throw new InvalidArgumentException('ID không hợp lệ.');
    }
    return $value;
}

function pb_sync_owned(PDO $pdo, string $table, mixed $value, int $userId): string {
    $id = pb_sync_id($value);
    $query = $pdo->prepare("SELECT id FROM $table WHERE id = ? AND user_id = ? AND deleted_at IS NULL");
    $query->execute([$id, $userId]);
    if (!$query->fetchColumn()) throw new InvalidArgumentException('Bản ghi liên kết không thuộc tài khoản hoặc đã xóa.');
    return $id;
}

function pb_sync_values(PDO $pdo, string $entity, array $r, int $userId): array {
    if ($entity === 'wallet') {
        $balance = $r['opening_balance_vnd'] ?? $r['initial_balance_vnd'] ?? null;
        if (!is_int($balance) || abs($balance) > 9007199254740991) throw new InvalidArgumentException('Số dư không hợp lệ.');
        return ['name' => pb_ai_text($r['name'] ?? null, 120), 'opening_balance_vnd' => $balance];
    }
    if ($entity === 'transaction') {
        $type = pb_ai_enum($r['type'] ?? null, ['income', 'expense', 'transfer']);
        $wallet = pb_sync_owned($pdo, 'wallets', $r['wallet_id'] ?? null, $userId);
        $destination = $type === 'transfer' ? pb_sync_owned($pdo, 'wallets', $r['destination_wallet_id'] ?? null, $userId) : null;
        if ($destination === $wallet) throw new InvalidArgumentException('Hai ví chuyển phải khác nhau.');
        return [
            'wallet_id' => $wallet, 'destination_wallet_id' => $destination, 'type' => $type,
            'amount_vnd' => pb_ai_money($r['amount_vnd'] ?? null),
            'category_code' => $type === 'transfer' ? null : pb_ai_enum($r['category_code'] ?? null, $type === 'income' ? PB_AI_INCOME : PB_AI_EXPENSE),
            'occurred_on' => pb_ai_date($r['occurred_on'] ?? null), 'note' => pb_ai_text($r['note'] ?? '', 500, true),
        ];
    }
    if ($entity === 'budget') {
        $month = $r['month'] ?? '';
        if (!is_string($month) || !preg_match('/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/D', $month)) {
            throw new InvalidArgumentException('Tháng ngân sách không hợp lệ.');
        }
        return ['month' => $month, 'limit_vnd' => pb_ai_money($r['limit_vnd'] ?? null)];
    }
    $status = pb_ai_enum($r['status'] ?? null, ['considering', 'bought', 'skipped']);
    return [
        'name' => pb_ai_text($r['name'] ?? null, 120), 'price_vnd' => pb_ai_money($r['price_vnd'] ?? null),
        'review_on' => pb_ai_date($r['review_on'] ?? null), 'status' => $status,
        'purchased_transaction_id' => $status === 'bought'
            ? pb_sync_owned($pdo, 'transactions', $r['purchased_transaction_id'] ?? null, $userId) : null,
    ];
}

function pb_sync_apply(PDO $pdo, int $userId, array $op): array {
    $opId = pb_sync_id($op['operation_id'] ?? null);
    $entity = pb_ai_enum($op['entity'] ?? null, array_keys(PB_SYNC_TABLES));
    $action = pb_ai_enum($op['action'] ?? null, ['upsert', 'delete']);
    $id = pb_sync_id($op['entity_id'] ?? null);
    $r = $op['record'] ?? null;
    $base = $op['base_version'] ?? null;
    if (!is_array($r) || ($r['id'] ?? null) !== $id || !is_int($base) || $base < 0) {
        throw new InvalidArgumentException('Dữ liệu đồng bộ không hợp lệ.');
    }
    $table = PB_SYNC_TABLES[$entity];
    $pdo->beginTransaction();
    try {
        // Serialize this user's operations so receipt and mutation commit together.
        $lock = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
        $lock->execute([$userId]);
        if (!$lock->fetchColumn()) throw new InvalidArgumentException('Tài khoản không tồn tại.');
        $receipt = $pdo->prepare('SELECT result_json FROM processed_operations WHERE user_id = ? AND operation_id = ?');
        $receipt->execute([$userId, $opId]);
        if ($stored = $receipt->fetchColumn()) {
            $pdo->commit();
            return json_decode($stored, true, 16, JSON_THROW_ON_ERROR);
        }

        $find = $pdo->prepare("SELECT version FROM $table WHERE id = ? AND user_id = ?");
        $find->execute([$id, $userId]);
        $version = (int)$find->fetchColumn();
        if ($version !== $base || ($action === 'delete' && $version === 0)) {
            $pdo->rollBack();
            return ['operation_id' => $opId, 'ok' => false, 'error' => [
                'code' => 'CONFLICT', 'message' => 'Dữ liệu đã đổi trên máy chủ. Khoản đang chờ vẫn được giữ trên máy.',
            ]];
        }
        $next = $version + 1;
        if ($action === 'delete') {
            $stmt = $pdo->prepare("UPDATE $table SET deleted_at = NOW(6), version = ? WHERE id = ? AND user_id = ?");
            $stmt->execute([$next, $id, $userId]);
        } else {
            $values = pb_sync_values($pdo, $entity, $r, $userId);
            $columns = array_keys($values);
            if ($version === 0) {
                $placeholders = implode(',', array_fill(0, count($columns) + 3, '?'));
                $stmt = $pdo->prepare("INSERT INTO $table (id, user_id, version, " . implode(',', $columns) . ") VALUES ($placeholders)");
                $stmt->execute([$id, $userId, $next, ...array_values($values)]);
            } else {
                $set = implode(',', array_map(static fn ($key) => "$key = ?", $columns));
                $stmt = $pdo->prepare("UPDATE $table SET $set, deleted_at = NULL, version = ? WHERE id = ? AND user_id = ?");
                $stmt->execute([...array_values($values), $next, $id, $userId]);
            }
        }
        $result = ['operation_id' => $opId, 'ok' => true, 'record' => ['id' => $id, 'version' => $next]];
        $save = $pdo->prepare('INSERT INTO processed_operations (user_id, operation_id, result_json) VALUES (?, ?, ?)');
        $save->execute([$userId, $opId, json_encode($result, JSON_THROW_ON_ERROR)]);
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
