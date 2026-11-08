# 03 — Task board cho 3 người

Điền tên: A = … ; B = … ; C = … . Điền ngày dự kiến: … . Không có deadline 48h mặc định.

Trạng thái dùng: todo / doing / review / done / blocked. Một người nhận task trước khi sửa. Các task sản phẩm dưới đây đều bắt đầu là todo; starter file tồn tại không nghĩa task hoàn thành.

## Mốc chung
| Mốc | Kết quả phải có trước khi qua mốc sau |
| --- | --- |
| G0 | Scope + screen sketch + contract, tên A/B/C, repo chung |
| G1 | Nhập một khoản local, refresh giữ lại; PHP/auth cơ bản; simulation pure |
| G2 | Push/pull một khoản, máy khác nhận, retry không trùng |
| G3 | CRUD offline, budget/dashboard, wishlist, chat draft thật |
| G4 | Kiểm thử, HTTPS điện thoại, report/video/setup máy khác |

## A — Thu chi, ví, backend
| Task | Việc làm và file chính | Dependency | Tiêu chí xong | Status |
| --- | --- | --- | --- | --- |
| A01 | Review schema.sql, config.example.php, api contract cùng B/C | G0 | Import DB được; mẫu transaction/wallet thống nhất | done |
| A02 | Auth PHP register/login/me/logout, PDO helper; hash/session/CSRF | A01 | Hai user cách ly; sai login trả lỗi; không commit config thật | done |
| A03 | UI ví + giao dịch trong modules/transactions.js; category từ config | B01 interface hoặc mock có nhãn | Form validate; CRUD gọi chung db.js; transfer không đổi tổng | done |
| A04 | sync.php: allowlist entity/action, quyền user, validation và transaction receipt | A01,A02,B01 | Retry cùng operation id chỉ một bản; 401/422/403 đúng | done |
| A05 | snapshot.php: data theo user gồm tombstone và version | A04 | Không lộ user khác; máy B lấy được create/update/delete | done |
| A06 | Phối hợp B optimistic version/conflict, API errors | A04,B04 | Không ghi đè âm thầm; pending không mất khi lỗi | done |
| A07 | Seed giả sau auth, setup DB và hướng dẫn backend | A02 | Bạn khác import/chạy được theo README | done |

Report/thuyết trình A: bài toán, yêu cầu, ERD, backend/quyền, ví và giao dịch. A hỗ trợ B phần server-side sync; không đẩy toàn sync cho B.

## B — Offline, dashboard, ngân sách
| Task | Việc làm và file chính | Dependency | Tiêu chí xong | Status |
| --- | --- | --- | --- | --- |
| B01 | db.js: reads theo user, saveAndQueue nguyên tử, schema version | A01 | Save entity + queue cùng thành công; refresh giữ data; user isolation | todo |
| B02 | Layout/style/app.js, dashboard.js, budget.js; domain/finance.js | G0,B01 | Responsive; công thức đúng; chọn tháng nhất quán | todo |
| B03 | Service Worker/manifest/icon, thêm mọi module/asset cần cache | Starter | Cold reopen sau chuẩn bị vẫn mở; không fallback HTML cho API | todo |
| B04 | sync.js + UI pending/error; push operations rồi merge snapshot | B01,A04,A05 | ACK đúng item; không đè pending; retry không trùng | todo |
| B05 | Handling 401/conflict, logout pending, một coordinator | B04,A06 | Không mất hàng chờ; status server độc lập navigator.onLine | todo |
| B06 | Biểu đồ và tổng quan theo data local; budget edit đồng bộ | B01,B04 | Cùng số liệu với sổ; không tính transfer vào thu/chi | todo |
| B07 | HTTPS/thiết bị thật; cập nhật cache không xóa data | B03 | Điện thoại demo có bằng chứng cài/offline; giới hạn nền tảng rõ | todo |

Report/thuyết trình B: Manifest, Service Worker, App Shell, IndexedDB, cache, luồng offline và so sánh PWA/native. A hỗ trợ B review đồng bộ; C hỗ trợ test và UI nếu B quá tải.

## C — Mô phỏng, wishlist, local chatbot
| Task | Việc làm và file chính | Dependency | Tiêu chí xong | Status |
| --- | --- | --- | --- | --- |
| C01 | simulation.js nối domain/finance.js; form giá/ngày/reserved | G0 hoặc fixtures ghi rõ | Trước/sau đúng; không đổi ledger; có tình huống ngân sách âm | review |
| C02 | wishlist.js tạo/sửa/status/review date qua db.js | B01,C01 | Reload giữ được; đến ngày hiện khi mở app | review |
| C03 | Nối “đã mua” vào draft chuẩn, lưu qua luồng A/B | A03,B01,C02 | Không tạo giao dịch chỉ vì mô phỏng; xác nhận một lần | review |
| C04 | Thử local model tiếng Việt, ghi tên/tag/setup và thời gian đo thật | Máy có Ollama | Chạy sau tải model, không dùng model cloud ngoài ý muốn | doing |
| C05 | server/ai, api/chat.php: auth/CSRF, whitelist intents/schema, timeout | A02,C04 | Ít nhất 3 tình huống chuẩn; thiếu trường hỏi lại; model lỗi báo thật | review |
| C06 | chat.js: UI, draft preview, mở simulation, context as_of/pending | C01,C05,B01 | Draft không tự lưu; số liệu dùng code; offline UI không treo | review |
| C07 | README phần AI + bộ câu hỏi demo/giới hạn | C05,C06 | Bạn khác cấu hình được, không cần đoán model/URL | review |

Report/thuyết trình C: điểm sáng tạo, before/after, wishlist, local AI và giới hạn kết nối. C review số liệu simulation cùng B.

## Công việc chung và ownership
- A làm màn hình ledger, B dashboard/budget, C simulation/wishlist/chat. Không giao toàn UI cho B.
- File chung: config.js/app.js/domain/finance.js/schema/API docs — announce task/PR trước khi đổi, cập nhật contract cùng thay đổi.
- A/B chốt giao diện db/sync trước G1; A/C chốt draft contract trước C03/C06.
- Report: ai viết module đó; B ghép định dạng, A kiểm nguồn/sơ đồ data, C ghép slide. Cả ba kiểm lại theo mẫu khoa.
- Video: A core/data, B offline/sync, C sáng tạo/AI; cả ba có tiếng và hình phù hợp yêu cầu môn.
- README: A backend, B frontend/PWA, C Ollama. Mỗi người chạy thử hướng dẫn của một bạn khác.

## P2 nếu còn thời gian
| Task | Chủ | Điều kiện |
| --- | --- | --- |
| Ảnh hóa đơn local + upload retry | A+B | G2 xong, không nhân đôi giao dịch khi ảnh lỗi |
| Một Web Push thật | C gửi, B nhận | G3 xong; xin quyền và test thiết bị hỗ trợ |
| Goals/category budgets | C+B | Không phá công thức hoặc tăng quá scope |

## Lịch nhận việc ngắn
Mỗi buổi ghi 3 dòng vào handoff: đã xong gì / đang vướng gì / người tiếp theo cần làm gì. Không yêu cầu ceremony dài; không cần 48h timeline khi chưa có deadline thật.

Bản ghép của C lấy `feat/integrated-pwa` tại `f2176a5` làm nền. Xem [cách chạy và checklist review](06_INTEGRATED_DEMO.md). Trạng thái review nghĩa là đã ghép code, còn chờ kiểm thử với PHP/MySQL/Ollama thật.
