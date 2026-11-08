<?php
declare(strict_types=1);

require_once __DIR__ . '/../../server/bootstrap.php';

$pdo = get_db();
start_session();

$action = $_GET['action'] ?? '';
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
