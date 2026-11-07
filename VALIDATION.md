# Kiểm tra bộ sườn — 29/10/2026

Đây là kết quả kiểm tra starter, không phải kết quả của MVP hoàn chỉnh.

## Đã thực hiện
- `npm run check`: pass — cú pháp JS, import nội bộ, liên kết tài liệu, icon manifest và file trong danh sách cache tồn tại.
- `npm test`: 5/5 pass — tổng theo tháng, loại transfer/tombstone/tháng khác, pending không bị bỏ khỏi số liệu; mô phỏng không đổi đầu vào, hạn mức thấp hơn số dư, dự trữ, vượt khả dụng và input không hợp lệ.
- Chạy Node preview và gọi HTTP tới 19 tài nguyên app shell: tất cả trả 200 và có nội dung.
- API/PHP trên Node preview trả 503 có thông điệp rõ ràng, không phục vụ mã PHP như source.
- Parse thành công package.json, manifest và JSON schema của AI.

## Chưa kiểm chứng trong môi trường tạo gói
- PHP lint/health thực thi, import MySQL, auth, query và sync end-to-end: môi trường không có PHP/MySQL đang chạy; phần nghiệp vụ còn TODO.
- Local model/Ollama: chưa cài/chạy model; chatbot còn TODO.
- Trình duyệt thật, giao diện mobile, cài PWA và Service Worker offline thật: đã thử khởi động Playwright nhưng môi trường thiếu executable Chromium. HTTP asset check không thay thế được các bài thử này.
- IndexedDB transaction/outbox và đồng bộ: mới có schema khởi tạo và contract, chưa có implementation nghiệp vụ để kiểm thử.

Thành viên B chạy phần browser/PWA theo docs/05_TESTING.md; A kiểm PHP/MySQL; C kiểm local AI. Không đánh dấu các đầu việc đó done chỉ dựa trên file sườn.
