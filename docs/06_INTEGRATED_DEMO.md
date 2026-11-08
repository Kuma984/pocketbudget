# 06 — Bản review phần C trên dashboard của nhóm

Nền: `feat/integrated-pwa` tại `f2176a56b273e32f00dff329288d7f8f159bdc50`. Giữ dashboard Cute Cat, tab Thu chi, ngân sách, camera/OCR và bố cục của nhánh. Các tab Mô phỏng, Chờ mua và Trợ lý AI dùng chung IndexedDB với sổ. Không có migration SQL mới.

## Cài trên Windows/XAMPP

1. Bật MySQL; với database trống, tạo `pocketbudget` và import `database/schema.sql`.
2. Sao chép `server/config.example.php` thành `server/config.local.php`. Điền thông tin MySQL; bật `pdo_mysql` và `curl` trong PHP.
3. Tại thư mục repo:

```powershell
C:\xampp\php\php.exe server/seed.php
C:\xampp\php\php.exe -S localhost:8000 -t public
```

Seed chỉ tạo dữ liệu mẫu khi tài khoản demo chưa có; không đặt lại dữ liệu cũ. Vào [http://localhost:8000/](http://localhost:8000/) → **Máy chủ & Auth** → đăng nhập demo hoặc đăng ký mới. Nên dùng database demo riêng và profile trình duyệt mới khi review: bản trước từng dùng ID `1` cho khách, nên bản này tách khách thành vùng `guest` và không tự chuyển dữ liệu cũ.

## Thử ba luồng

1. **Mô phỏng:** bấm **Thử số liệu mẫu**. Từ 1.000.000đ cho 10 ngày, mua món 400.000đ thì mức chia đều giảm từ 100.000đ còn 60.000đ/ngày. Mở **Thu chi & ví** để xác nhận mô phỏng chưa tạo giao dịch. Đặt ngân sách tháng trước nếu muốn nút **Lấy từ sổ trên máy** điền đủ số liệu.
2. **Chờ mua:** chuyển món từ Mô phỏng sang Chờ mua và bấm lưu. Khi offline trong cùng tab đã đăng nhập, tải lại, mở món và chọn **Đã mua…**. Điền ví, kiểm tra dữ liệu và bấm xác nhận. Kiểm tra sổ chỉ có một khoản chi. Kết nối lại và bấm **Đồng bộ**; kiểm tra hàng chờ ở **Máy chủ & Auth**.
3. **Chat:** cài Ollama cùng máy PHP, tải một model local như `ollama pull qwen2.5:3b`. Trong `server/config.local.php`, giữ `http://127.0.0.1:11434/api` và đặt model đúng tên từ `ollama list`. Có thể chạy `php tools/chat-local.php "Tạo bản nháp ăn trưa 45k hôm nay"` để thử model. Trong app, thử hỏi tổng chi tháng, mô phỏng tai nghe 400k và tạo bản nháp ăn trưa 45k. Kiểm tra câu hỏi về chi tiêu lấy tổng từ dữ liệu trên thiết bị và bản nháp chỉ thành giao dịch sau xác nhận.

Tải app online trước, đợi Service Worker cài xong, rồi tải lại trong cùng tab trước khi thử offline. Khi trình duyệt không gọi được máy PHP, chatbot không dùng được; vẫn có thể mô phỏng thủ công và lưu wishlist trên thiết bị đã đăng nhập. Ảnh hóa đơn giữ ở thiết bị; thư viện OCR tải qua mạng. Nếu bị xung đột khi đồng bộ, app dừng và giữ phần chưa được xác nhận trong hàng chờ; chưa có màn xử lý xung đột.

## Bàn giao review

- A: kiểm tra `auth.php`, `snapshot.php`, `sync.php` và `server/sync-records.php` bằng MySQL demo. Thử tạo/sửa/xóa một khoản, giữ hàng chờ khi lỗi, và retry sau phản hồi thất lạc.
- B: kiểm tra dashboard, định dạng ngân sách, thao tác camera/OCR và mở lại app offline trên điện thoại. Thử lỗi API khi ảnh vẫn còn ở máy.
- C: kiểm tra ba intent tiếng Việt bằng Ollama đã cài, lỗi khi Ollama tắt, mô phỏng số dư âm và draft không tạo khoản chi trước khi xác nhận.
