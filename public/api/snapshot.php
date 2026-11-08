<?php
declare(strict_types=1);

require_once __DIR__ . '/../../server/bootstrap.php';

// Bắt buộc phải đăng nhập mới lấy được dữ liệu của mình
$userId = require_login();
$pdo = get_db();

// 1. Lấy danh sách ví của user (kèm cả ví đã xóa để client biết xóa theo)
$stmtWallets = $pdo->prepare('SELECT id, name, opening_balance_vnd, version, deleted_at FROM wallets WHERE user_id = ?');
$stmtWallets->execute([$userId]);
$wallets = $stmtWallets->fetchAll();

// 2. Lấy danh sách giao dịch của user
$stmtTx = $pdo->prepare('SELECT id, wallet_id, destination_wallet_id, type, amount_vnd, category_code, occurred_on, note, version, deleted_at FROM transactions WHERE user_id = ? ORDER BY occurred_on DESC');
$stmtTx->execute([$userId]);
$transactions = $stmtTx->fetchAll();

// 3. Lấy ngân sách
$stmtBudgets = $pdo->prepare('SELECT id, month, limit_vnd, version, deleted_at FROM budgets WHERE user_id = ?');
$stmtBudgets->execute([$userId]);
$budgets = $stmtBudgets->fetchAll();

// 4. Lấy danh sách chờ mua
$stmtWishlist = $pdo->prepare('SELECT id, name, price_vnd, review_on, status, purchased_transaction_id, version, deleted_at FROM wishlist WHERE user_id = ?');
$stmtWishlist->execute([$userId]);
$wishlist = $stmtWishlist->fetchAll();

json_response([
    'ok' => true,
    'data' => [
        'user_id' => (string)$userId,
        'wallets' => $wallets,
        'transactions' => $transactions,
        'budgets' => $budgets,
        'wishlist' => $wishlist,
        'server_time' => date('c'),
    ]
]);
