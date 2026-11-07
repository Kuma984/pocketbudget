# Quy tắc chung cho thành viên và AI

Áp dụng cho repo này. Đọc README, docs/01_SCOPE.md, docs/02_ARCHITECTURE.md và task đang nhận trước khi thay đổi.

## Phạm vi và cách làm
1. Đây là dự án PWA môn học, 3 thành viên, xây từ đầu. Tài liệu/ảnh Minty chỉ tham khảo. Không tự đổi thành dự án hackathon hoặc sản phẩm doanh nghiệp nhiều dịch vụ.
2. Stack đã chọn: HTML/CSS/JS ES modules + PHP/PDO/MySQL + IndexedDB + Service Worker + Ollama qua backend. Không tự thêm React, Docker, Redis, queue server hoặc vector DB.
3. Chỉ làm task đã nhận; task ngoài scope ghi đề xuất trước. Nếu thông tin không rõ, ghi giả định và hỏi chủ task thay vì tự đổi contract.
4. Mỗi người sửa module mình. File chung/schema/API phải phối hợp và cập nhật tài liệu; không tự rewrite cả app hoặc format toàn repo.
5. Mọi chức năng TODO phải hiển thị rõ chưa triển khai hoặc ném lỗi. Không giả thành công, không giả có sync/AI. Không hardcode câu trả lời rồi gọi là LLM.

## Bất biến dữ liệu
6. amount_vnd là số nguyên dương, trong giới hạn Number.MAX_SAFE_INTEGER; tiền tổng có thể âm. Không dùng số thực cho số tiền lưu. Dùng occurred_on YYYY-MM-DD theo ngày địa phương.
7. type chỉ là income, expense, transfer. Transfer giữa hai ví của cùng user không tạo thu nhập/chi tiêu. Danh mục chỉ dùng code trong config.js/architecture.
8. Frontend không tự viết nhiều bản công thức: dùng domain/finance.js. Mô phỏng không tự ghi giao dịch; người dùng xác nhận rõ ở luồng giao dịch chung.
9. Lưu entity và operation trong một IndexedDB transaction. Operation ID giữ nguyên khi retry. ID giao dịch giữ nguyên khi sửa/xóa.
10. Chỉ bỏ khỏi outbox sau khi có xác nhận server. 401 giữ queue và đăng nhập lại; 409 giữ conflict; lỗi validation không retry vô hạn. Dùng tombstone cho xóa đã cần đồng bộ.
11. User_id do server lấy từ phiên auth. Mọi dữ liệu local phân vùng theo user. Logout/switch user không được âm thầm xóa pending hoặc lộ dữ liệu người cũ.
12. Snapshot server không được ghi đè local pending. Server lưu mutation + operation receipt nguyên tử; replay không cộng tiền lần hai.

## AI và giao diện
13. Chat đi qua API backend có auth. Không gọi model cloud ngoài ý muốn; không public nguyên dịch vụ Ollama. Prompt không phải cơ chế phân quyền.
14. Chỉ cho AI trả intent/draft có schema, validate server/client, whitelist hành động. Không chạy SQL/mã tùy ý do model sinh. Không tự ghi/sửa/xóa tiền từ hội thoại.
15. Số liệu do code tính, gắn nguồn/thời điểm/pending. Model không truy cập được thì báo đúng, chức năng thủ công vẫn dùng.
16. Không ghi credentials hoặc dữ liệu tài chính thật vào source, prompt mẫu hay log. config.local.php không commit.
17. UI tiếng Việt, responsive, tiền VND. README/docs hướng dẫn nhóm bằng tiếng Việt; báo cáo/video cuối theo yêu cầu môn học. Không chép ảnh/logo/giao diện tham khảo vào sản phẩm.

## Bàn giao
18. Mỗi PR ghi task, file đổi, cách chạy, kiểm thử thực tế và hạn chế. Dùng docs/04_HANDOFF.md. Không nói đã test nếu chỉ đọc code.
19. Update docs/03_TASKS.md khi nhận/hoàn thành task. Mỗi PR có ít nhất một thành viên khác review trước ghép main.
20. Ưu tiên hoàn thành một luồng đúng từ đầu tới cuối. Không tự tăng scope để làm demo trông nhiều tính năng hơn.
