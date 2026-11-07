# 01 — Scope và bài toán

## Bài toán
Sinh viên muốn biết tiền đã chi vào đâu, còn bao nhiêu ngân sách và một khoản mua mới ảnh hưởng kế hoạch ra sao. Mạng gián đoạn làm việc ghi chép bị ngắt nếu app phụ thuộc hoàn toàn vào server.

PocketBudget ưu tiên ghi sổ được ngay, xem số liệu từ dữ liệu đã lưu, thử trước tác động của khoản mua và nối tiếp dữ liệu khi có kết nối. Không cần dựng câu chuyện doanh nghiệp phức tạp: bài toán thật của bản này là quản lý chi tiêu cá nhân cho sinh viên.

## Một luồng sử dụng xuyên suốt
1. Online: đăng nhập, chuẩn bị dữ liệu local.
2. Offline: thêm chi ăn trưa 45.000đ, xem ngân sách cập nhật, reload vẫn còn.
3. Mô phỏng: còn 1 triệu/10 ngày, thử mua món 400k; mức chia đều đổi 100k thành 60k/ngày nếu không có hạn mức thấp hơn hoặc khoản giữ riêng.
4. Chưa mua: lưu món vào wishlist, chọn ngày xem lại.
5. Online: đồng bộ; thiết bị khác nhận được khoản đã ghi. Retry không nhân đôi.
6. Chatbot: “ăn trưa 45k tiền mặt” tạo draft; người dùng xác nhận qua luồng giao dịch, không tạo tự động.

## In-scope bản cần hoàn thành
| Mã | Chức năng | Mức hoàn thành cần đạt |
| --- | --- | --- |
| M01 | Tài khoản | Online register/login/logout, user isolation |
| M02 | Ví + thu chi | Ví nhập tay số dư ban đầu; income/expense/transfer, CRUD và lọc |
| M03 | Ngân sách tháng + tổng quan | Thẻ số liệu, chi theo danh mục, thu/chi theo kỳ; số liệu đúng |
| M04 | Offline-first | Giao diện mở lại; data + outbox giữ sau reload; không báo lưu khi lưu lỗi |
| M05 | Sync | Push operations, pull snapshot, retry idempotent, xóa và 401/409 rõ |
| M06 | Mô phỏng mua | Trước/sau cho số dư, ngân sách, mức chia đều/ngày; không ghi sổ ngầm |
| M07 | Wishlist | Lưu tên, giá, ngày xem lại, trạng thái; “đã mua” tạo draft và xác nhận |
| M08 | Chatbot local hẹp | 3 intent: expense_summary, simulate_purchase, draft_transaction; validate và fallback |

M01–M05 là nền. M06 là điểm sáng tạo chính. M07–M08 ghép sau nền và không được làm hỏng nhập thủ công. Nếu thiếu thời gian, ưu tiên hoàn thiện M06 và ít intent chat nhưng chạy thật thay vì chat nhiều tính năng giả.

## Sau bản cơ bản, nếu còn thời gian
- Ảnh hóa đơn bằng camera/chọn file, chưa OCR.
- Một luồng Web Push có cấp quyền và server gửi thật.
- Ngân sách theo danh mục; mục tiêu tiết kiệm liên kết với tiền thật trong sổ.
- Đánh giá sau mua; nhắc xem lại wishlist khi app đóng.

Đề môn học có gợi ý camera và push; nhóm nên cân nhắc làm sau nền để demo phong phú. Chúng không được ghi “đã có” khi mới có nút UI.

## Out-of-scope
- Banking API, chuyển/thu tiền thật, tự đọc SMS/thông báo ngân hàng.
- Quỹ chung nhiều người, khoản nợ, đầu tư, tín dụng, nhiều loại tiền.
- Tự động quyết định mua, tự ghi tiền từ AI, dự đoán thu nhập chắc chắn.
- Fine-tune model, RAG/vector DB, agent tự chạy SQL; inference trong browser điện thoại.
- Real-time WebSocket, microservices, Kubernetes, hệ phân tán hoặc scale lớn khi chưa có MVP.

## Các giới hạn cần nói đúng
| Khả năng | Online, API truy cập được | Offline điện thoại, không tới server |
| --- | --- | --- |
| Đăng nhập mới | Có | Không; chỉ xem data của user đã chuẩn bị |
| Thu chi/ngân sách/mô phỏng/wishlist | Có | Có theo data local |
| Thay đổi từ máy khác | Có khi sync | Chưa lấy được, hiện thời điểm cập nhật |
| Model chạy trên laptop | Có nếu backend/AI sẵn sàng | Không nếu điện thoại không liên lạc được laptop |
| Nhắc trong app | Có | Có khi app đang mở |
| Web Push mới | Có thể nhận nếu hỗ trợ/cấp quyền | Cần kết nối trở lại |

Mất Internet nhưng vẫn có LAN tới laptop là tình huống khác với mất mọi kết nối. Có thể demo AI local qua LAN nếu cấu hình HTTPS/network đúng; không bắt buộc cho bản đầu.

## Definition of MVP Done
- Có tài khoản demo được tạo đúng cách, hai user không lộ dữ liệu.
- Thu chi/sửa/xóa/transfer đúng số tiền và kỳ.
- Offline reload giữ dữ liệu + pending.
- Retry cùng operation không tạo hai giao dịch; máy khác lấy được snapshot.
- Mô phỏng đúng, không đổi sổ thật; wishlist nối vào draft đúng một lần.
- Ít nhất một luồng chatbot thật qua local model, nhãn hạn chế rõ.
- README chạy được trên máy thứ hai; có bằng chứng kiểm thử và video/report theo đề môn.

Starter hiện tại chưa đạt MVP này. Đây là đích nhóm cần làm, không phải trạng thái đã hoàn thành.
