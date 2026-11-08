# PocketBudget — Progressive Web App Quản Lý Chi Tiêu Sinh Viên Thông Minh (Offline-First)

> **Môn học:** Lập trình Web và Ứng dụng (Web Programming & Applications — 503073)  
> **Học kỳ:** Học kỳ 1 — Năm học 2026 – 2027  
> **Khoa:** Khoa Công nghệ Thông tin — Trường Đại học Tôn Đức Thắng (TDTU)  
> **Chủ đề đăng ký (Topic 2):** Progressive Web Apps (PWAs)  

---

## 📌 Giới thiệu Dự án

**PocketBudget** là ứng dụng web lũy tiến (Progressive Web App - PWA) chuyên sâu về quản lý tài chính cá nhân dành cho sinh viên với mô hình kiến trúc **Offline-First**. 

Ứng dụng giải quyết triệt để vấn đề mất mạng / gián đoạn kết nối internet khi sinh viên đi ăn uống, mua sắm hoặc thanh toán hàng quán:
* **Ghi chép giao dịch ngoại tuyến 100%:** Người dùng có thể nhập chi tiêu, quét hóa đơn bằng camera mọi lúc mọi nơi kể cả khi bật Chế độ máy bay.
* **Cơ chế đồng bộ Outbox Idempotent 2 chiều:** Dữ liệu tự động đẩy lên máy chủ MySQL ngay khi có mạng trở lại mà không lo bị trùng lặp số tiền hay lỗi dữ liệu.
* **Tích hợp Trợ lý Trí tuệ nhân tạo (AI Assistant) & Mô phỏng:** Giúp sinh viên dự toán ngân sách chi tiêu hàng ngày, ngăn ngừa mua sắm bốc đồng.

---

## 👥 Phân công Trách nhiệm Thành viên Nhóm

| Thành viên | Vai trò | Trách nhiệm & Module chính |
| :--- | :--- | :--- |
| **Thành viên A** | **Core Backend & Sync Engine** | • Thiết kế cơ sở dữ liệu MySQL, xây dựng REST API PHP (PDO).<br>• Xác thực người dùng (Auth, Hash mật khẩu, Session, CSRF Token).<br>• Kiến trúc sổ cái đa ví (Tiền mặt, Ngân hàng, MoMo) & tính toàn vẹn số dư.<br>• Hàng đợi đồng bộ Outbox 2 chiều, chống gửi trùng lặp (Idempotent Sync). |
| **Thành viên B** | **PWA Core, Offline Architecture & UI/UX** | • Service Worker App Shell (Cache Storage v22) & IndexedDB cục bộ.<br>• Giao diện Cute Cat Meme Theme (Hiệu ứng mưa xu, nút Jelly, Meme cảnh báo chi tiêu vượt ngưỡng).<br>• Lịch chi tiêu nhật ký (Calendar Grid) & biểu đồ phân tích danh mục.<br>• Quét hóa đơn tự động qua Camera điện thoại & AI OCR (Tesseract.js).<br>• Cài đặt PWA Standalone trên cả Android (Maskable icon) & iOS (Safari). |
| **Thành viên C** | **AI Assistant, Purchase Simulator & Wishlist** | • Trợ lý AI tài chính đa lượt (Multi-turn Chat) kèm các nút hỏi nhanh (Quick Actions).<br>• Tích hợp Ollama Local LLM & bộ sinh câu trả lời số liệu chính xác (`chat-answers.js`).<br>• Module Mô phỏng Mua sắm (Purchase Simulator): Đánh giá sức khỏe tài chính trước khi mua đồ đắt tiền.<br>• Danh sách Chờ mua (Savings Wishlist): Hỗ trợ tiết kiệm và chuyển đổi thành khoản chi thật khi mua. |

---

## 🚀 Các Tính Năng Nổi Bật Đã Xây Dựng

### 1. Ứng dụng PWA Offline-First chuẩn quốc tế
* Hoạt động độc lập không cần Internet: Tải trước toàn bộ App Shell vào Cache Storage.
* Cài đặt như ứng dụng Native: Kích hoạt nút **"Cài đặt ứng dụng"** trên Chrome Android và **"Thêm vào Màn hình chính"** trên Safari iOS.
* Nhận diện trạng thái mạng động theo thời gian thực (Probe Ping 3.5s): Tự động chuyển đổi huy hiệu `🟢 Online` $\leftrightarrow$ `🔴 Offline` tức thì kèm Toast thông báo.

### 2. Quản lý Đa ví & Sổ cái Tài chính
* Quản lý phân quyền độc lập theo từng tài khoản sinh viên.
* Hỗ trợ đầy đủ 3 loại ví mặc định: `💵 Tiền mặt`, `🏦 Ngân hàng`, `💖 Ví MoMo` cùng chức năng **Tạo ví mới, Đổi tên ví và Xóa ví an toàn**.
* Hỗ trợ 3 luồng giao dịch: **Khoản chi (-)**, **Khoản thu (+)** và **Chuyển ví (⇄)** với định luật bảo toàn tài sản ròng.

### 3. Tương tác Phần cứng & AI OCR Nhận Diện Hóa Đơn
* Tích hợp Camera trực tiếp trên thiết bị di động (Camera Native / Thư viện ảnh).
* Ứng dụng mô hình AI OCR `Tesseract.js` nhận diện chữ và tự động trích xuất số tiền trên hóa đơn ăn uống, mua sắm.

### 4. Giao diện Cảnh báo Trực quan (Cute Cat Meme Edition)
* Vạch tiến độ ngân sách tháng trực quan: 
  * 🟢 `< 80%`: Trong tầm kiểm soát.
  * 🟡 `80% - 100%`: Cảnh báo ngân sách.
  * 🔴 `> 100%`: Vượt mức kèm popup Meme Mèo thảng thốt bay xu nhắc nhở.
* Lịch theo dõi chi tiêu từng ngày, streak chi tiêu và hiệu ứng tương tác mượt mà (60fps).

### 5. Trợ lý AI & Bộ công cụ Tiết kiệm
* Chatbot giải đáp thông minh mọi câu hỏi tài chính sinh viên: *"Tôi còn bao nhiêu tiền?"*, *"Tháng này chi bao nhiêu?"*, *"Ví MoMo còn bao nhiêu?"*.
* Mô phỏng tác động tài chính: Nhập giá tiền món đồ định mua $\rightarrow$ Hệ thống tự động tính số tiền mỗi ngày còn lại nếu mua món đồ đó.

---

## 🛠️ Công Nghệ Sử Dụng (Technology Stack)

* **Giao diện (Frontend):** HTML5, CSS3 Custom Properties (Modern Responsive, Flexbox, Grid), Vanilla JavaScript (ES Modules hiện đại, không dùng framework nặng để tối ưu dung lượng PWA).
* **Bộ nhớ đệm & Ngoại tuyến:** Service Worker API (Cache-First / Stale-While-Revalidate), Web App Manifest, IndexedDB API (`PocketBudgetDB`).
* **Máy chủ (Backend):** PHP 8.2+ (PDO MySQL, Session Auth, Prepared Statements, CSRF Protection, RESTful JSON API).
* **Cơ sở dữ liệu:** MySQL 8.0+ / MariaDB 10.4+ (XAMPP).
* **AI & Trí tuệ nhân tạo:**
  * Client-side OCR: Tesseract.js (Optical Character Recognition).
  * Local LLM NLU: Ollama (hỗ trợ mô hình `llama3.2`, kèm bộ quy tắc NLU xác định trên IndexedDB).

---

## 📋 Yêu Cầu Môi Trường (System Requirements)

* **Hệ điều hành:** Windows 10/11, macOS, hoặc Linux.
* **Web Server:** PHP >= 8.2 (kèm các extension: `pdo_mysql`, `curl`, `mbstring`, `session`).
* **Cơ sở dữ liệu:** MySQL >= 8.0 hoặc MariaDB >= 10.4 (có sẵn trong XAMPP).
* **Trình duyệt khuyến nghị:** Google Chrome, Microsoft Edge, hoặc Apple Safari mới nhất.
* **Trợ lý AI (Tùy chọn):** [Ollama](https://ollama.ai) (nếu muốn kích hoạt LLM cục bộ; nếu không có Ollama, hệ thống tự động chạy bộ xử lý quy tắc nội bộ chuẩn xác 100%).

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Dự Án (Step-by-step Setup)

### Bước 1: Khởi động Cơ sở dữ liệu MySQL
1. Mở **XAMPP Control Panel** và nhấn **Start** dịch vụ **MySQL** (hoặc mở MySQL Server cục bộ của bạn).
2. Mở phpMyAdmin tại `http://localhost/phpmyadmin` (hoặc dùng MySQL CLI).
3. Tạo cơ sở dữ liệu mới mang tên: `pocketbudget`.
4. Import file cấu trúc dữ liệu từ thư mục dự án:
   ```
   database/schema.sql
   ```

### Bước 2: Cấu hình Kết nối Máy chủ
Kiểm tra file cấu hình kết nối tại `server/config.local.php`. Nếu dùng cấu hình XAMPP mặc định (user: `root`, không mật khẩu):
```php
<?php
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'dbname' => 'pocketbudget',
        'user' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
    ],
    'ollama' => [
        'base_url' => 'http://127.0.0.1:11434/api',
        'model' => 'llama3.2',
        'timeout_seconds' => 15,
    ],
];
```

### Bước 3: Khởi chạy Máy chủ Ứng dụng
Mở Terminal / PowerShell tại thư mục dự án `pocketbudget-starter` và chạy lệnh máy chủ tích hợp của PHP:
```bash
php -S 0.0.0.0:8000 -t public
```

### Bước 4: Trải nghiệm Ứng dụng
* **Trên Máy tính (Desktop):** Mở trình duyệt và truy cập:
  ```
  http://localhost:8000
  ```
* **Trên Điện thoại di động (PWA Cài đặt):**
  * Dùng Cloudflare Tunnel hoặc ngrok để tạo cổng HTTPS an toàn:
    ```bash
    cloudflared tunnel --url http://localhost:8000
    ```
  * Mở link HTTPS trên trình duyệt điện thoại và chọn **"Thêm vào Màn hình chính"** hoặc **"Cài đặt ứng dụng"** để trải nghiệm chạy Offline như App thật.

---

## 🔑 Tài Khoản Trải Nghiệm Mẫu (Demo Credentials)

Giảng viên / Người chấm có thể dùng ngay tài khoản thử nghiệm có sẵn:

* **Email đăng nhập:** `demo@pocketbudget.local`
* **Mật khẩu:** `pocketbudget123`

*(Hoặc có thể tự bấm vào tab **Đăng ký** trên giao diện để tạo tài khoản sinh viên mới; hệ thống sẽ tự động khởi tạo sẵn 3 ví tiền mặt, ngân hàng và MoMo cho tài khoản mới).*

---

## 🧪 Hướng Dẫn Kiểm Thử Chức Năng (Testing Guide)

### 1. Kiểm thử Tính năng Offline (PWA)
1. Mở ứng dụng trên trình duyệt hoặc điện thoại di động.
2. Đăng nhập vào hệ thống.
3. Bật **Chế độ máy bay (Airplane mode)** hoặc ngắt kết nối Wifi/Internet.
4. Quan sát huy hiệu chuyển sang **`🔴 Offline`** kèm thông báo Toast.
5. Thêm một khoản chi (ví dụ: Ăn trưa 35.000đ). Dữ liệu lập tức được ghi vào IndexedDB và giao diện cập nhật ngay tức thì.
6. Tải lại trang (F5): Dữ liệu vẫn được bảo toàn nguyên vẹn từ bộ nhớ đệm.
7. Bật lại mạng: Huy hiệu chuyển sang **`🟢 Online`** và hệ thống tự động đẩy giao dịch lên cơ sở dữ liệu MySQL.

### 2. Kiểm thử Unit Test Tự Động
Chạy các kịch bản kiểm thử tính đúng đắn của logic tài chính và AI:
```bash
# Kiểm thử phân loại ý định & AI Ollama connector
php tests/chat-validation.php
php tests/chat-ollama.php
```
*(Cả 2 kịch bản kiểm thử đều đạt kết quả **PASS 100%**).*

---

## 📁 Cấu Trúc Thư Mục Dự Án (Repository Structure)

```text
pocketbudget/
├── database/
│   └── schema.sql                # Cấu trúc bảng MySQL (users, wallets, transactions, budgets, wishlist)
├── docs/
│   ├── 01_SCOPE.md               # Mô tả bài toán và phạm vi đề tài
│   ├── 02_ARCHITECTURE.md        # Kiến trúc hệ thống và luồng đồng bộ Outbox
│   └── 05_TESTING.md             # Tài liệu kịch bản kiểm thử
├── public/                       # Thư mục Web Root (Public Assets)
│   ├── index.html                # Trang giao diện chính (App Shell)
│   ├── manifest.webmanifest      # Khai báo cấu hình PWA & Maskable Icons
│   ├── sw.js                     # Service Worker điều phối Cache Storage Offline
│   ├── css/                      # Bảng định dạng giao diện cục bộ (Remixicon, Layout, Components)
│   ├── icons/                    # Biểu tượng PWA chuẩn 192x192, 512x512
│   ├── img/                      # Hình ảnh đồ họa & Meme mèo cục bộ
│   ├── js/
│   │   ├── app.js                # Bộ điều phối trung tâm ứng dụng
│   │   ├── db.js                 # Lớp tương tác IndexedDB & Outbox Queue
│   │   ├── sync.js               # Động cơ đồng bộ 2 chiều máy chủ
│   │   └── modules/              # Các phân hệ: Dashboard, Thu chi, Ngân sách, AI Chat, Mô phỏng, Wishlist
│   └── api/                      # REST API Endpoints (auth, sync, snapshot, health, chat)
├── server/                       # Mã nguồn xử lý Backend PHP & AI Engine
│   ├── bootstrap.php             # Khởi tạo kết nối CSDL và session
│   ├── config.local.php          # Cấu hình môi trường nội bộ
│   ├── sync-records.php          # Logic xử lý giao dịch đồng bộ Idempotent
│   └── ai/                       # Tích hợp Ollama AI & Bộ quy tắc xác thực ý định
└── tests/                        # Bộ kiểm thử tự động (Unit Tests)
```

---

## 📄 Bản Quyền & Giấy Phép
Dự án được thực hiện bởi nhóm sinh viên Khoa Công nghệ Thông tin — **Trường Đại học Tôn Đức Thắng (TDTU)** phục vụ cho bài tập lớn giữa kỳ môn học **Lập trình Web và Ứng dụng (503073)**.
