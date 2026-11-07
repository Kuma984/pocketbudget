# 04 — Handoff ngắn cho người và AI

Copy mẫu dưới vào PR hoặc thêm một mục ở cuối file khi cần. Không tạo hàng chục file bàn giao cho thay đổi nhỏ.

## Mẫu
```text
Task ID / Thành viên:
Branch / commit:
Trạng thái: doing | review | done | blocked

Đã làm:
- ...

File đã đổi:
- ...

Contract/schema có thay đổi không:
- Không / Có, thay đổi gì, hai bạn còn lại đã biết chưa?

Cách chạy và kiểm tra:
1. ...
2. ...

Kết quả thực tế:
- Đã chạy: ...
- Chưa chạy hoặc chưa có môi trường: ...

TODO / lỗi còn biết:
- ...

Người nhận và bước tiếp theo:
- B cần gọi hàm ... với input ...
```

## Checklist trước PR
- Thay đổi nằm trong task, không đổi stack hoặc scope ngầm.
- Không secret/data thật/model weights.
- Không báo lưu/sync thành công khi chỉ mock.
- Không tự ghi tiền từ AI.
- Schema/API docs đã cập nhật nếu cần.
- npm run check; npm test khi đổi công thức. PHP lint nếu đổi PHP và có môi trường.
- Kiểm thử phù hợp với chức năng; ghi rõ chưa test phần nào.

## Handoff khởi đầu
Starter có layout navigation, static cache, DB open, finance utilities và endpoint placeholders. Tất cả task sản phẩm trong 03_TASKS vẫn todo. Hãy lấy A01/B01/C01 làm điểm bắt đầu sau G0, không coi việc có file sẵn là chức năng đã chạy.


## Handoff: Triển khai hoàn chỉnh Backend (A01, A02, A04, A05, A06, A07, C05)
Task ID / Thành viên: A01, A02, A04, A05, A06, A07, C05 / Thành viên A & C
Trạng thái: review

Đã làm:
- `server/bootstrap.php`: Xây dựng đầy đủ helper nạp cấu hình, kết nối PDO MySQL singleton, khởi tạo session an toàn (HttpOnly, SameSite=Lax), xác thực `require_auth()`, bảo vệ CSRF `verify_csrf_token()`, đọc input JSON, sinh UUID và error handler chuẩn JSON.
- `public/api/auth.php` (A02): Đầy đủ các luồng `register`, `login`, `me`, `logout`. Cách ly người dùng bằng session server, băm mật khẩu `password_hash`, sinh ví "Tiền mặt" ban đầu cho tài khoản mới, cấp mã `csrf_token`.
- `public/api/sync.php` (A04, A06): Tiếp nhận mảng operations (upsert / delete cho wallet, transaction, budget, wishlist). Kiểm tra allowlist enum/entity, kiểm tra quyền sở hữu ví và giao dịch, kiểm tra ràng buộc chuyển ví (transfer), xử lý optimistic versioning và phát hiện `CONFLICT`, lưu idempotent receipt vào bảng `processed_operations` để chống replay/double charge khi retry.
- `public/api/snapshot.php` (A05): Lấy toàn bộ dữ liệu thuộc user hiện tại gồm wallets, transactions, budgets, wishlist (kèm cả bản ghi đã xóa deleted_at làm tombstone để client đồng bộ).
- `public/api/health.php`: Kiểm tra kết nối cơ sở dữ liệu PDO và kiểm tra trạng thái dịch vụ AI Ollama thật kèm danh sách models khả dụng.
- `public/api/chat.php` (C05): Tích hợp Ollama local, nạp system prompt và bối cảnh tài chính an toàn của user, thực hiện timeout, validate schema và intent (`expense_summary`, `simulate_purchase`, `draft_transaction`, `unsupported`). Không tự ý ghi dữ liệu.
- `server/seed.php` (A07): Script tạo tài khoản và dữ liệu mẫu (ví, ngân sách tháng, các giao dịch thu/chi/chuyển khoản, danh sách chờ mua) để kiểm thử ngay.

File đã đổi:
- `server/bootstrap.php`
- `server/seed.php` (tạo mới)
- `public/api/auth.php`
- `public/api/sync.php`
- `public/api/snapshot.php`
- `public/api/health.php`
- `public/api/chat.php`
- `docs/03_TASKS.md`
- `docs/04_HANDOFF.md`

Contract/schema có thay đổi không:
- Giữ nguyên 100% schema.sql và API contract trong docs/02_ARCHITECTURE.md.

Cách chạy và kiểm tra:
1. Tạo database `pocketbudget` trong MySQL: `CREATE DATABASE pocketbudget CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. Import schema: `mysql -u root pocketbudget < database/schema.sql`
3. Tạo file `server/config.local.php` dựa theo `server/config.example.php` và điền tài khoản MySQL + model Ollama.
4. Chạy seed tạo dữ liệu mẫu: `php server/seed.php` (tài khoản demo: `demo@pocketbudget.local` / `pocketbudget123`).
5. Khởi động server PHP: `php -S localhost:8000 -t public`
6. Kiểm tra endpoint health: `GET http://localhost:8000/api/health.php`

Người nhận và bước tiếp theo:
- Thành viên B có thể kết nối `db.js` và `sync.js` với `api/sync.php` và `api/snapshot.php`.
- Thành viên C có thể kết nối giao diện `chat.js` với `api/chat.php`.


## Handoff bổ sung: Hoàn thành Task A03 & Review số dư / chống trùng
Task ID / Thành viên: A03, Review số dư/chống trùng / Thành viên A
Trạng thái: done

Đã làm:
- `public/js/modules/transactions.js` (A03): Xây dựng hoàn chỉnh màn hình quản lý ví và thu chi cho thành viên A.
  - Quản lý ví: Thêm ví mới, số dư ban đầu, hiển thị số dư tính toán động theo thời gian thực.
  - Giao dịch thu - chi - chuyển ví: Form nhập liệu validate chặt chẽ (amount > 0, ngày YYYY-MM-DD, chọn danh mục theo loại, chọn ví đích cho transfer).
  - Sổ giao dịch (Ledger): Hiển thị danh sách, phân loại màu sắc, trạng thái pending sync, hỗ trợ sửa và xóa giao dịch.
  - Tích hợp Auth: Có panel đăng nhập/đăng ký hoặc nút Đăng nhập nhanh Demo để kiểm thử ngay.
- `public/js/domain/finance.js`: Bổ sung `calculateWalletBalances` và `calculateTotalBalance` đảm bảo bất biến: giao dịch chuyển khoản giữa 2 ví không làm thay đổi tổng tài sản, không tính vào thu nhập hay chi tiêu.
- `public/js/db.js`: Hoàn thiện `listRecords` và `saveAndQueue` nguyên tử trên IndexedDB cho entity và outbox store, phục vụ trực tiếp cho màn hình A03.
- `tests/finance.test.js`: Bổ sung test tự động kiểm chứng công thức tính số dư ví và tổng số dư với giao dịch chuyển ví.

Kết quả kiểm tra logic:
- Chống trùng (Idempotency): Server đã có receipt trong `processed_operations`, client giữ nguyên `operation_id` trong outbox khi retry.
- Bất biến số dư: Transfer giữa 2 ví đã được chứng minh bảo toàn tổng số dư.
