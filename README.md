# PocketBudget — Bộ sườn dự án PWA cho nhóm 3 người

Ứng dụng quản lý chi tiêu sinh viên: ghi thu chi khi mất mạng, đồng bộ sau, mô phỏng tác động của một khoản mua và dùng chatbot local để tra cứu/nhập bản nháp.

**Đây là starter repo để nhóm tự thiết kế và code từ đầu. Không phải app đã hoàn thiện.** Tên PocketBudget là tên tạm, nhóm có thể đổi. File Minty và các ảnh chỉ là tài liệu tham khảo, không được sao chép vào starter này.

## 1. Đọc gì trước?

1. [Phạm vi MVP và bài toán](docs/01_SCOPE.md).
2. [Kiến trúc, dữ liệu và API](docs/02_ARCHITECTURE.md).
3. [Phân công 3 người và thứ tự triển khai](docs/03_TASKS.md).
4. [Quy tắc làm việc và dùng AI](AGENTS.md).
5. [Mẫu bàn giao](docs/04_HANDOFF.md).
6. [Checklist kiểm thử và demo](docs/05_TESTING.md).

Khi dùng Claude, bắt đầu bằng [CLAUDE.md](CLAUDE.md); quy tắc đầy đủ nằm trong AGENTS.md.

## 2. Mục tiêu sản phẩm

- Người dùng ghi một khoản chi ngay cả khi không có mạng.
- Đóng/mở app không làm mất khoản đã lưu hoặc yêu cầu chưa gửi.
- Khi server truy cập được, app gửi thay đổi và lấy dữ liệu mới; retry không nhân đôi số tiền.
- Trước khi mua, thử xem số dư và ngân sách mỗi ngày thay đổi như thế nào.
- Chatbot local giải thích dữ liệu và tạo bản nháp; người dùng xác nhận trước khi ghi sổ.

**Không có lịch hackathon 48h hoặc phân công 6 người trong tài liệu này.** Nhóm dùng các mốc bàn giao theo thứ tự và tự điền ngày thật.

## 3. Những gì starter đã có

| Có sẵn | Chưa có, nhóm cần xây |
| --- | --- |
| Trang điều hướng mẫu, responsive cơ bản | Giao diện sản phẩm hoàn chỉnh |
| Manifest, icon, Service Worker cache app shell | Thu chi, ngân sách và danh sách chờ hoạt động thật |
| Hàm mở IndexedDB và tạo object stores | Đọc/ghi theo user, lưu giao dịch + outbox nguyên tử |
| Hàm tính tổng và mô phỏng thuần JavaScript có unit test | UI, lưu trạng thái và nối dữ liệu thực cho các hàm |
| API health trả trạng thái starter; endpoint khác trả 501 | Auth, MySQL queries, đồng bộ và chatbot |
| SQL schema khởi đầu, cấu hình mẫu, tài liệu contract | Dữ liệu demo, xử lý toàn bộ lỗi và triển khai HTTPS |

**Đừng trình bày rằng starter đã có sync hoặc AI.** Các hàm chưa làm ném lỗi rõ ràng; các API nghiệp vụ trả `501 NOT_IMPLEMENTED`. Thanh “Mạng” chỉ phản ánh tín hiệu trình duyệt, không phải kết quả kết nối server hoặc AI.

## 4. Tech stack

- Frontend: HTML, CSS, JavaScript ES modules, không cần frontend framework.
- Offline: IndexedDB cho dữ liệu, Service Worker + Cache Storage cho file giao diện.
- Backend: PHP 8.2+ với PDO MySQL. API cùng origin với frontend để bớt cấu hình CORS.
- Database: MySQL 8+ (nếu dùng MariaDB qua XAMPP, kiểm tra/import schema trước và thống nhất phiên bản cả nhóm).
- AI: Ollama trên máy chạy backend hoặc một máy mà backend gọi được. Chưa chốt model; C thử chất lượng tiếng Việt/tốc độ trước.
- GitHub: một repo chung, branch tính năng và PR ngắn.
- Node.js 20+ là **tùy chọn** để preview frontend và chạy check/test; không cần npm install, không có dependencies npm.

## 5. Chạy bộ sườn

### Cách A — có PHP

Mở terminal tại thư mục có README này:

```bash
php -S localhost:8000 -t public
```

Mở `http://localhost:8000`. Chạy đúng lệnh để chỉ `public/` được phục vụ, không phục vụ cả repo.

Nếu Windows chưa có php trong PATH nhưng có XAMPP:

```powershell
C:\xampp\php\php.exe -S localhost:8000 -t public
```

Ở starter, trang và `api/health.php` chạy không cần MySQL. Nút kiểm tra backend phải trả trạng thái `scaffold`. API nghiệp vụ vẫn là TODO.

### Cách B — chỉ xem frontend, có Node.js

```bash
node tools/preview.mjs
```

Mở `http://localhost:8000`. Server preview này chặn PHP/API và trả 503 có giải thích, không thực thi PHP. Nó chỉ phục vụ app shell và không thay thế backend.

### Chuẩn bị database khi A bắt đầu làm backend

1. Tạo database tên `pocketbudget` với charset utf8mb4.
2. Import `database/schema.sql` vào database vừa tạo.
3. Copy `server/config.example.php` thành `server/config.local.php`.
4. Điền thông tin database của máy mình. File config.local.php đã được ignore.
5. A triển khai auth/API; C chọn model và điền tên vào cấu hình local.

Schema không tạo tài khoản và mật khẩu demo. A tạo seed sau khi có password hashing; không lưu mật khẩu thật hoặc model weights vào repo.

### Kiểm tra app shell offline

Mở trang online, đợi thông báo Service Worker đã đăng ký, tải lại trang để có controller. Trong DevTools, bật Offline rồi tải lại. Giao diện điều hướng phải mở được. **Bài thử này chỉ chứng minh cache giao diện; lưu thu chi offline chưa được triển khai.**

Service Worker cần HTTPS hoặc localhost. Điện thoại truy cập IP laptop qua HTTP không tự trở thành secure context. HTTPS/LAN/certificate trên thiết bị demo là đầu việc B phải kiểm thử sớm.

## 6. Cấu trúc thư mục và chủ sở hữu

| Đường dẫn | Chức năng | Người chính |
| --- | --- | --- |
| `public/index.html`, `public/css/` | Layout, style chung | B; các thành viên góp UI module mình |
| `public/js/modules/transactions.js` | Giao dịch + ví | A |
| `public/js/modules/dashboard.js`, `budget.js` | Tổng quan, ngân sách | B |
| `public/js/modules/simulation.js`, `wishlist.js`, `chat.js` | Mô phỏng, chờ mua, chat | C |
| `public/js/db.js`, `sync.js` | IndexedDB, outbox và sync phía client | B, A review contract |
| `public/js/domain/finance.js` | Công thức tiền dùng chung | B + C, A kiểm tra sổ |
| `public/js/config.js`, `api.js`, `app.js` | Enum, API client, điều hướng chung | File dùng chung, báo team trước sửa |
| `public/sw.js`, `manifest.webmanifest`, `icons/` | Cache và cài PWA | B |
| `public/api/auth.php`, `sync.php`, `snapshot.php` | Điểm vào PHP | A |
| `public/api/chat.php`, `server/ai/` | Chatbot local, schema đầu ra | C |
| `server/bootstrap.php`, `config.example.php` | Response helper, cấu hình | A; C thêm cấu hình AI cùng A |
| `database/schema.sql` | Database ban đầu | A, đổi schema phải cập nhật docs |
| `docs/`, `AGENTS.md`, `CLAUDE.md` | Context, task và handoff | Cả nhóm |
| `tests/`, `tools/` | Test công thức, kiểm tra file và preview | Cả nhóm |

Đây là một web app và một backend đơn giản; chưa cần microservices, Docker, Redis, vector database hay framework kiến trúc nhiều tầng.

## 7. Phân công nhanh

- **A — Core & backend:** tài khoản, ví, giao dịch, schema/API, server sync, màn hình giao dịch. Review số dư/chống trùng.
- **B — PWA & dashboard:** layout, ngân sách, biểu đồ, IndexedDB/outbox, client sync, Service Worker và HTTPS demo.
- **C — Simulation & AI:** mô phỏng, danh sách chờ, UI chatbot và API Ollama. Tạo draft giao dịch theo contract của A/B.

Chi tiết từng task, dependency và tiêu chí hoàn thành nằm ở `docs/03_TASKS.md`. Ai cũng code UI module của mình và viết/report/trình bày phần mình; không gom frontend hoặc report cho một người.

## 8. Workflow GitHub gọn

1. Một người tạo repo GitHub rồi đưa starter này vào. Gói này chưa được push tới GitHub.
2. Mọi người clone cùng repo; điền tên A/B/C và ngày mục tiêu trong task board.
3. Tạo branch như `feat/a-transactions`, `feat/b-offline`, `feat/c-simulation`.
4. Trước khi code, chọn task và ghi trạng thái `doing` trong task board để tránh đụng việc.
5. Commit nhỏ, mở PR vào main; ít nhất một bạn review. Không tự sửa lịch sử branch của bạn khác.
6. PR ghi cách chạy, kết quả đã test và hạn chế; dùng template có sẵn.
7. Nếu đổi schema, enum hoặc API chung, cập nhật docs và thông báo hai người còn lại trước khi ghép.

Khởi tạo repo khi đã tạo remote thật (thay REPO_URL, không dùng nguyên placeholder):

```bash
git init
git add .
git commit -m "chore: add project scaffold"
git branch -M main
git remote add origin REPO_URL
git push -u origin main
```

Không commit `config.local.php`, database dump có dữ liệu thật, mật khẩu, thư mục model Ollama hoặc `.git` lồng trong repo.

## 9. Check/test và việc đầu tiên

Nếu có Node.js:

```bash
npm run check
npm test
```

Check kiểm tra import/asset/local docs và cú pháp JS. Test hiện có chỉ kiểm chứng các công thức thuần; không thay thế kiểm thử offline/sync/auth/AI. PHP lint khi có PHP:

```bash
php -l server/bootstrap.php
php -l public/api/health.php
```

Tình trạng kiểm tra gói do người tạo thực hiện nằm trong `VALIDATION.md`. Chưa có MySQL/PHP/Ollama end-to-end thì không đánh dấu các tính năng đó đã xong.

**Buổi đầu:** đọc scope cùng nhau → chốt dữ liệu/API → A làm auth + transaction API, B làm lưu local + outbox, C làm công thức/UI mô phỏng bằng dữ liệu giả. Mốc ghép đầu tiên là “nhập một khoản → local giữ sau reload → sync lên server → máy khác lấy được”.

## 10. Tài liệu chính thức

- [Service Worker — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB — MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Ollama API](https://docs.ollama.com/api/introduction)

Đề xuất kỹ thuật trong repo là kế hoạch thiết kế, không phải cam kết mọi nền tảng có cùng khả năng offline/AI.
