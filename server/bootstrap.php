<?php
declare(strict_types=1);

// Bắt đầu session nếu chưa có
function start_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'httponly' => true, 'samesite' => 'Lax',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        ]);
        session_start();
    }
}

// Nạp cấu hình từ config.local.php (hoặc config.example.php)
function load_config(): array {
    $configFile = __DIR__ . '/config.local.php';
    if (!file_exists($configFile)) {
        $configFile = __DIR__ . '/config.example.php';
    }
    return require $configFile;
}

// Kết nối cơ sở dữ liệu MySQL bằng PDO
function get_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = load_config();

    $dsn = $config['db']['dsn'] ?? 'mysql:host=127.0.0.1;port=3306;dbname=pocketbudget;charset=utf8mb4';
    $user = $config['db']['user'] ?? 'root';
    $pass = $config['db']['password'] ?? '';

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

// Tương thích ngược với tên gọi cũ
function get_db_connection(): PDO {
    return get_db();
}

// Lấy ID người dùng đang đăng nhập từ Session
function get_logged_in_user_id(): ?int {
    start_session();
    return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

// Bắt buộc phải đăng nhập mới được tiếp tục
function require_login(): int {
    $userId = get_logged_in_user_id();
    if ($userId === null) {
        json_response([
            'ok' => false,
            'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Bạn chưa đăng nhập.']
        ], 401);
    }
    return $userId;
}

// Trả về dữ liệu JSON
function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Đọc dữ liệu JSON gửi lên từ client (Fetch API)
function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Hàm sinh mã UUID đơn giản
function simple_uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Tương thích ngược với tên gọi cũ
function generate_uuid(): string {
    return simple_uuid();
}

function csrf_token(): string {
    start_session();
    return $_SESSION['csrf_token'] ??= bin2hex(random_bytes(32));
}

function verify_csrf_token(): void {
    $token = $_SESSION['csrf_token'] ?? '';
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || $token === '' || !hash_equals($token, $sent)) {
        json_response(['ok' => false, 'error' => [
            'code' => 'INVALID_CSRF', 'message' => 'Phiên không hợp lệ. Tải lại hoặc đăng nhập lại.',
        ]], 403);
    }
}
