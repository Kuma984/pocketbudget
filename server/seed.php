<?php
declare(strict_types=1);

/**
 * Script khởi tạo dữ liệu mẫu (Seed) cho môi trường phát triển / kiểm thử.
 * Chạy bằng dòng lệnh: php server/seed.php
 */

require_once __DIR__ . '/bootstrap.php';

$isCli = (php_sapi_name() === 'cli');

function output_line(string $text): void
{
    global $isCli;
    if ($isCli) {
        echo $text . PHP_EOL;
    } else {
        echo htmlspecialchars($text) . "<br>\n";
    }
}

try {
    $pdo = get_db();
} catch (Throwable $e) {
    output_line('[LỖI] Không thể kết nối cơ sở dữ liệu: ' . $e->getMessage());
    output_line('Hãy đảm bảo đã tạo database "pocketbudget" và cấu hình đúng trong server/config.local.php.');
    exit(1);
}

output_line('=== Khởi tạo dữ liệu mẫu cho PocketBudget ===');

$demoEmail = 'demo@pocketbudget.local';
$demoPassword = 'pocketbudget123';
$demoName = 'Sinh Viên Demo';

// 1. Kiểm tra xem user demo đã tồn tại chưa
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$demoEmail]);
$existingUser = $stmt->fetch();

if ($existingUser) {
    $userId = (int)$existingUser['id'];
    output_line("[INFO] Người dùng demo đã tồn tại (User ID: {$userId}). Tiến hành làm mới dữ liệu mẫu...");
    
    // Dọn dẹp dữ liệu cũ của user demo để tránh trùng lặp
    $pdo->prepare('DELETE FROM processed_operations WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare('DELETE FROM wishlist WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare('DELETE FROM transactions WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare('DELETE FROM budgets WHERE user_id = ?')->execute([$userId]);
    $pdo->prepare('DELETE FROM wallets WHERE user_id = ?')->execute([$userId]);
} else {
    $passwordHash = password_hash($demoPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$demoName, $demoEmail, $passwordHash]);
    $userId = (int)$pdo->lastInsertId();
    output_line("[OK] Đã tạo tài khoản demo: {$demoEmail} / mật khẩu: {$demoPassword}");
}

// 2. Tạo 2 ví mẫu
$cashWalletId = generate_uuid();
$bankWalletId = generate_uuid();

$stmtWallet = $pdo->prepare('INSERT INTO wallets (id, user_id, name, opening_balance_vnd, version, updated_at) VALUES (?, ?, ?, ?, 1, NOW(6))');
$stmtWallet->execute([$cashWalletId, $userId, 'Tiền mặt', 350000]);
$stmtWallet->execute([$bankWalletId, $userId, 'Tài khoản Ngân hàng', 2500000]);
output_line('[OK] Đã tạo 2 ví: "Tiền mặt" (350.000 đ) và "Tài khoản Ngân hàng" (2.500.000 đ)');

// 3. Tạo ngân sách tháng hiện tại
$currentMonth = date('Y-m');
$budgetId = generate_uuid();
$stmtBudget = $pdo->prepare('INSERT INTO budgets (id, user_id, month, limit_vnd, version, updated_at) VALUES (?, ?, ?, ?, 1, NOW(6))');
$stmtBudget->execute([$budgetId, $userId, $currentMonth, 3000000]);
output_line("[OK] Đã tạo ngân sách tháng {$currentMonth}: 3.000.000 đ");

// 4. Tạo các giao dịch mẫu trong tháng hiện tại
$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));
$twoDaysAgo = date('Y-m-d', strtotime('-2 days'));

$stmtTx = $pdo->prepare(
    'INSERT INTO transactions (id, user_id, wallet_id, destination_wallet_id, type, amount_vnd, category_code, occurred_on, note, version, updated_at) ' .
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(6))'
);

// Thu nhập: Trợ cấp sinh hoạt
$stmtTx->execute([generate_uuid(), $userId, $bankWalletId, null, 'income', 3000000, 'allowance', $twoDaysAgo, 'Bố mẹ gửi tiền sinh hoạt tháng']);

// Chi tiêu: Ăn uống
$stmtTx->execute([generate_uuid(), $userId, $cashWalletId, null, 'expense', 45000, 'food', $yesterday, 'Cơm trưa căn tin']);
$stmtTx->execute([generate_uuid(), $userId, $cashWalletId, null, 'expense', 30000, 'food', $today, 'Bánh mì & cà phê sáng']);

// Chi tiêu: Học tập
$stmtTx->execute([generate_uuid(), $userId, $bankWalletId, null, 'expense', 150000, 'study', $yesterday, 'Giáo trình và tài liệu in']);

// Chuyển khoản ví: Rút tiền ATM từ ngân hàng vào ví tiền mặt
$stmtTx->execute([generate_uuid(), $userId, $bankWalletId, $cashWalletId, 'transfer', 200000, null, $today, 'Rút tiền ATM tiêu vặt']);
output_line('[OK] Đã tạo 5 giao dịch mẫu (thu nhập, chi tiêu ăn uống, học tập, chuyển ví).');

// 5. Tạo các mục trong danh sách chờ mua (Wishlist)
$reviewDate1 = date('Y-m-d', strtotime('+7 days'));
$reviewDate2 = date('Y-m-d', strtotime('+14 days'));

$stmtWishlist = $pdo->prepare('INSERT INTO wishlist (id, user_id, name, price_vnd, review_on, status, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(6))');
$stmtWishlist->execute([generate_uuid(), $userId, 'Tai nghe chống ồn học tập', 850000, $reviewDate1, 'considering']);
$stmtWishlist->execute([generate_uuid(), $userId, 'Balo chống nước', 320000, $reviewDate2, 'considering']);
output_line('[OK] Đã tạo 2 mục Wishlist với thời gian chờ xem xét.');

output_line('');
output_line('=== HOÀN TẤT KHỞI TẠO DỮ LIỆU SEED ===');
output_line("Thông tin đăng nhập thử nghiệm:");
output_line("  - Email:    {$demoEmail}");
output_line("  - Mật khẩu: {$demoPassword}");
