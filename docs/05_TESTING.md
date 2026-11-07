# 05 — Kiểm thử và demo

Các ô dưới chưa được thực hiện cho app hoàn chỉnh. Chỉ tick khi có kết quả thực tế; ghi browser/device, input, expected/actual và ảnh nếu cần. Xem VALIDATION.md cho những gì starter đã được kiểm tra.

## Core
- [ ] Register/login đúng và sai; user khác không đọc/sửa được records.
- [ ] Số tiền không nguyên/0/âm/quá giới hạn bị chặn, ngày địa phương đúng.
- [ ] opening=1.000.000đ, income=200.000đ, expense=45.000đ → balance=1.155.000đ.
- [ ] Transfer 100k từ ví A sang B: tổng không đổi; số dư từng ví đổi đúng.
- [ ] Giao dịch cuối tháng, tháng trước, tombstone và pending tính đúng kỳ.
- [ ] Budget còn âm vẫn hiển thị vượt mức, không cắt về 0 để che lỗi.

## Offline/sync
- [ ] Sau lần chuẩn bị, bật offline, đóng/mở hoặc reload vẫn mở app và dữ liệu.
- [ ] Thêm/sửa/xóa offline còn sau reload; hàng chờ cũng còn.
- [ ] Server đã commit nhưng client mất ACK; retry không thêm bản sao.
- [ ] Hai lần gửi đồng thời cùng operation ID không nhân đôi.
- [ ] ACK thao tác cũ không xóa thay đổi mới vừa tạo.
- [ ] Snapshot không ghi đè record đang pending hoặc làm record đã xóa sống lại.
- [ ] 401 giữ queue; đăng nhập lại tiếp tục; switch user không lộ data.
- [ ] 422 hiển thị lỗi sửa được; 409 hiển thị conflict rõ, không lặp retry vô hạn.
- [ ] Mạng báo online nhưng server unreachable: UI báo lỗi/giữ queue.
- [ ] Cập nhật Service Worker/cache không xóa IndexedDB hoặc pending.
- [ ] Không dùng HTML fallback làm JSON API; server không trả fake success.

## Mô phỏng/wishlist/AI
- [ ] 1 triệu/10 ngày, budget đủ: thử mua 400k → 600k và 60k/ngày; sổ thật không đổi.
- [ ] Budget thấp hơn số dư thì dùng hạn mức thấp hơn; có reserved không tính trùng.
- [ ] Giá lớn hơn khả dụng hiển thị thiếu tiền/âm, không bảo đảm “nên mua”.
- [ ] Wishlist save/reload; ngày xem lại hiện khi mở app.
- [ ] Đã mua chỉ tạo một draft/transaction sau xác nhận.
- [ ] Chat 3 intent, thiếu ví/ngày hỏi lại; không tự đoán đã ghi sổ.
- [ ] Model trả JSON sai/timeout: báo lỗi, UI nhập tay vẫn dùng.
- [ ] Câu trả lời số liệu khớp phép tính, có as_of/pending; không lấy data user khác.
- [ ] Điện thoại không kết nối laptop: không giả LLM còn hoạt động.

## Demo đề xuất
1. Online: chuẩn bị tài khoản và data giả trên điện thoại/laptop.
2. Điện thoại offline: ghi 45k, reload, mở mô phỏng và wishlist.
3. Online: sync, thấy khoản trên laptop, retry không trùng.
4. Chatbot local: “ăn trưa 45k tiền mặt” → draft → xác nhận.
5. Nêu rõ giới hạn, trạng thái những phần chưa làm.

## Trước nộp môn học
- [ ] Lấy đúng template khoa từ lớp; starter này không thay template báo cáo.
- [ ] Report Word/PDF, source/dependencies/README, slide/video theo đề thật.
- [ ] Kiểm tra report/video tiếng Anh, đủ thành viên, thời lượng và âm thanh.
- [ ] Setup trên máy khác; nộp đúng deadline lớp.

Nhóm đối chiếu bản đề hiện tại trước nộp; các checklist này không thay rubric giảng viên.
