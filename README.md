# PocketBudget — PWA quản lý chi tiêu sinh viên

PocketBudget ghi thu chi vào IndexedDB và gửi lên MySQL khi kết nối lại. Bản review này ghép mô phỏng trước khi mua, danh sách chờ mua và chatbot Ollama vào dashboard Cute Cat hiện có của nhóm.

- [Chạy và demo bản ghép](docs/06_INTEGRATED_DEMO.md).
- [Phạm vi MVP](docs/01_SCOPE.md), [kiến trúc và dữ liệu](docs/02_ARCHITECTURE.md), [phân công A/B/C](docs/03_TASKS.md).
- [Quy tắc repo](AGENTS.md), [bàn giao](docs/04_HANDOFF.md), [checklist kiểm thử](docs/05_TESTING.md).

## Chạy nhanh

1. Bật MySQL, tạo database `pocketbudget`, import `database/schema.sql` vào database trống.
2. Copy `server/config.example.php` thành `server/config.local.php`, điền cấu hình MySQL của máy. File local không đưa lên GitHub.
3. Từ thư mục repo, chạy `php server/seed.php` rồi `php -S localhost:8000 -t public`. Trên Windows có XAMPP có thể dùng `C:\xampp\php\php.exe` thay cho `php`.
4. Mở [http://localhost:8000/](http://localhost:8000/). Vào **Máy chủ & Auth** để đăng nhập demo hoặc đăng ký. Vào **Mô phỏng → Thử số liệu mẫu** để thử không cần backend.

Node.js 20+ dùng để chạy `npm run check` và `npm test`. `node tools/preview.mjs` chỉ chạy giao diện; dùng PHP để thử tài khoản, đồng bộ và chatbot. Không cần cài dependencies npm. Xem [VALIDATION.md](VALIDATION.md) để biết kết quả kiểm thử và phần cần kiểm tra tại máy nhóm.

## Cấu trúc và workflow

| Đường dẫn | Nội dung |
| --- | --- |
| `public/` | App shell, dashboard, giao diện và PHP API |
| `public/js/modules/` | Dashboard, thu chi, ngân sách, mô phỏng, wishlist và chat |
| `public/js/db.js`, `sync.js`, `public/sw.js` | IndexedDB, outbox, đồng bộ và cache |
| `server/` | Cấu hình riêng, xác thực, ghi MySQL và gọi Ollama |
| `database/`, `tests/`, `tools/`, `docs/` | Schema, kiểm thử, công cụ và tài liệu |

Làm trên branch riêng; mở PR để A/B/C review thay đổi chung trước khi ghép. Chạy PHP với document root `public/`. Không commit mật khẩu thật, config local, dữ liệu tài chính hay model weights.
