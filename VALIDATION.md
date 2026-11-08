# Kiểm tra bản review PocketBudget

- Nền lấy từ ZIP GitHub của `feat/integrated-pwa`, commit `f2176a56b273e32f00dff329288d7f8f159bdc50`.
- `npm run check`: đạt, bao gồm cú pháp JS, đường dẫn import và tài nguyên cache.
- `npm test`: 13 bài kiểm tra đạt, gồm công thức, bản nháp, thử lại khi ghi trạng thái wishlist lỗi và hành vi Service Worker trong môi trường mô phỏng.
- Patch được kiểm tra trên bản giải nén sạch của ZIP gốc.
- Chưa kiểm thử trên trình duyệt thật, điện thoại hoặc với PHP/MySQL/Ollama thật. Trình duyệt không khởi động được trong môi trường kiểm tra. Xem [checklist review](docs/06_INTEGRATED_DEMO.md) để thử trên máy nhóm.
