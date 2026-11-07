# Context cho Claude và các AI hỗ trợ

Đọc [AGENTS.md](AGENTS.md) trước: đó là nguồn quy tắc duy nhất, tránh hai file tự mâu thuẫn.

Sau đó đọc theo thứ tự:
1. README.md — cách chạy và trạng thái starter.
2. docs/01_SCOPE.md — MVP/out-of-scope.
3. docs/02_ARCHITECTURE.md — data/API/sync contracts.
4. docs/03_TASKS.md — người phụ trách và task ID.
5. docs/04_HANDOFF.md — mẫu bàn giao.

Mẫu prompt của thành viên:
> Tôi là thành viên B, đang làm B02. Đọc context repo và contract trước, giữ nguyên stack/schema, chỉ triển khai file của task. Nếu cần sửa file chung, nêu lý do. Sau khi làm, kiểm thử phù hợp và ghi handoff gồm file đổi, cách chạy, bằng chứng, hạn chế. Không đánh dấu phần chưa chạy là đã hoàn thành.

Không có API/auth/sync/LLM thật trong starter. Những phần đó là việc nhóm phải triển khai. Test finance pass không có nghĩa toàn app hoàn thành.
