<?php
declare(strict_types=1);

require_once __DIR__ . '/../../server/bootstrap.php';

$pdo = get_db();
start_session();

function is_legit_email(string $email, ?string &$errorMsg = null): bool {
    $email = trim(strtolower($email));
    
    // 1. Kiểm tra cú pháp cơ bản
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errorMsg = 'Định dạng email không đúng chuẩn (ví dụ: yourname@gmail.com).';
        return false;
    }
    
    $parts = explode('@', $email);
    if (count($parts) !== 2) {
        $errorMsg = 'Địa chỉ email không hợp lệ.';
        return false;
    }
    
    [$user, $domain] = $parts;
    
    // 2. Chặn các nhà cung cấp email ảo / rác tạm thời (Disposable emails)
    $disposableDomains = [
        'tempmail.com', '10minutemail.com', 'mailinator.com', 'guerrillamail.com',
        'trashmail.com', 'yopmail.com', 'dispostable.com', 'sharklasers.com',
        'fakeinbox.com', 'getairmail.com', 'throwawaymail.com', 'burnermail.io'
    ];
    if (in_array($domain, $disposableDomains, true)) {
        $errorMsg = 'Vui lòng không sử dụng email ảo/tạm thời để đăng ký tài khoản.';
        return false;
    }
    
    // 3. Kiểm tra chuyên sâu chuẩn Google đối với Gmail
    if ($domain === 'gmail.com' || $domain === 'googlemail.com') {
        $cleanUser = str_replace('.', '', $user);
        if (strlen($cleanUser) < 6 || strlen($cleanUser) > 30) {
            $errorMsg = 'Tài khoản Gmail phải có tên người dùng từ 6 đến 30 ký tự.';
            return false;
        }
        
        if (!preg_match('/^[a-z0-9.]+$/', $user)) {
            $errorMsg = 'Tài khoản Gmail chỉ được chứa chữ cái (a-z), chữ số (0-9) và dấu chấm.';
            return false;
        }
        
        if (strpos($user, '..') !== false || str_starts_with($user, '.') || str_ends_with($user, '.')) {
            $errorMsg = 'Tài khoản Gmail không được chứa dấu chấm liên tiếp hoặc ở đầu/cuối tên người dùng.';
            return false;
        }
    }
    
    // 4. Kiểm tra DNS Domain nếu là domain thực tế (bỏ qua tên miền local)
    if (!str_ends_with($domain, '.local') && $domain !== 'localhost') {
        if (function_exists('checkdnsrr')) {
            $hasMx = @checkdnsrr($domain, 'MX');
            $hasA = @checkdnsrr($domain, 'A');
            if (!$hasMx && !$hasA) {
                $errorMsg = 'Tên miền email "' . htmlspecialchars($domain) . '" không tồn tại hoặc không thể nhận thư.';
                return false;
            }
        }
    }
    
    return true;
}


$action = $_GET['action'] ?? '';
if ($action === 'ping') {
    json_response(['ok' => true, 'timestamp' => time()]);
}
$input = get_json_input();
if (in_array($action, ['register', 'login', 'logout'], true) && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(['ok' => false, 'error' => ['message' => 'Thao tác này yêu cầu POST.']], 405);
}

if (in_array($action, ['register', 'login'], true) &&
    strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
    json_response(['ok' => false, 'error' => ['message' => 'Yêu cầu dữ liệu JSON.']], 415);
}

// 1. ĐĂNG KÝ (REGISTER)
if ($action === 'register') {
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if ($name === '' || $email === '' || $password === '') {
        json_response(['ok' => false, 'error' => ['message' => 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.']], 400);
    }

    $emailError = null;
    if (!is_legit_email($email, $emailError)) {
        json_response(['ok' => false, 'error' => ['message' => $emailError]], 400);
    }

    if (strlen($password) < 6) {
        json_response(['ok' => false, 'error' => ['message' => 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.']], 400);
    }

    // Kiểm tra xem email đã tồn tại chưa
    $check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        json_response(['ok' => false, 'error' => ['message' => 'Email này đã được đăng ký.']], 409);
    }

    // Mã hóa mật khẩu và lưu vào bảng users
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $hash]);
    $userId = (int)$pdo->lastInsertId();

    // Tạo sẵn 3 chiếc ví mặc định (Tiền mặt, Ngân hàng, Ví MoMo) cho người dùng mới
    $stmtWallet = $pdo->prepare('INSERT INTO wallets (id, user_id, name, opening_balance_vnd, version) VALUES (?, ?, ?, ?, 1)');
    $stmtWallet->execute([simple_uuid(), $userId, '💵 Tiền mặt', 0]);
    $stmtWallet->execute([simple_uuid(), $userId, '🏦 Ngân hàng', 0]);
    $stmtWallet->execute([simple_uuid(), $userId, '💖 Ví MoMo', 0]);

    // Lưu phiên đăng nhập
    session_regenerate_id(true);
    unset($_SESSION['csrf_token']);
    $_SESSION['user_id'] = $userId;

    json_response([
        'ok' => true,
        'data' => [
            'user' => ['id' => (string)$userId, 'name' => $name, 'email' => $email],
            'csrf_token' => csrf_token()
        ]
    ]);
}

// 2. ĐĂNG NHẬP (LOGIN)
if ($action === 'login') {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(['ok' => false, 'error' => ['message' => 'Email hoặc mật khẩu không chính xác.']], 401);
    }

    // Lưu ID người dùng vào session
    session_regenerate_id(true);
    unset($_SESSION['csrf_token']);
    $_SESSION['user_id'] = (int)$user['id'];

    json_response([
        'ok' => true,
        'data' => [
            'user' => ['id' => (string)$user['id'], 'name' => $user['name'], 'email' => $user['email']],
            'csrf_token' => csrf_token()
        ]
    ]);
}

// 3. LẤY THÔNG TIN TÀI KHOẢN HIỆN TẠI (ME)
if ($action === 'me') {
    $userId = get_logged_in_user_id();
    if ($userId === null) {
        json_response(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Chưa đăng nhập.']], 401);
    }

    $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        session_destroy();
        json_response(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Tài khoản không tồn tại.']], 401);
    }

    json_response([
        'ok' => true,
        'data' => [
            'user' => ['id' => (string)$user['id'], 'name' => $user['name'], 'email' => $user['email']],
            'csrf_token' => csrf_token()
        ]
    ]);
}

// 4. ĐĂNG XUẤT (LOGOUT)
if ($action === 'logout') {
    start_session();

$_SESSION = [];
    if (session_id() !== '') {
        session_destroy();
    }
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    json_response(['ok' => true, 'data' => null]);
}

// Nếu action không hợp lệ
json_response(['ok' => false, 'error' => ['message' => 'Action không hợp lệ.']], 400);
