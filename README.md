# PocketBudget — Offline-First Smart Personal Finance Progressive Web App (PWA)

> **Course:** Web Programming & Applications (Course ID: 503073)  
> **Academic Year:** Semester 1 – Academic Year 2026 – 2027  
> **Faculty:** Faculty of Information Technology — Ton Duc Thang University (TDTU)  
> **Topic 2:** Progressive Web Apps (PWAs)  
> **Repository:** [https://github.com/Kuma984/pocketbudget](https://github.com/Kuma984/pocketbudget)

---

## 📌 Executive Summary

**PocketBudget** is a production-grade Progressive Web App (PWA) crafted specifically for students to manage personal finances, control budgets, and curb impulsive spending with a true **Offline-First** architecture.

Unlike conventional web applications that fail when connectivity drops, PocketBudget guarantees uninterrupted operations in real-world scenarios (campus basements, cafeterias, remote transit, or airplane mode):
1. **100% Offline Usability:** All core actions—recording expenses/incomes, managing multiple wallets, running financial health simulations, and scanning receipt photos via camera OCR—work flawlessly without any internet connection.
2. **Reliable Two-Way Idempotent Sync:** Offline transactions are stored safely in client-side **IndexedDB** with an outbox queue and automatically synchronized with the backend server upon reconnection without double-spending or duplicate entries.
3. **Hardware & AI Capabilities:** Leverages device camera hardware to run client-side Optical Character Recognition (**Tesseract.js**) to extract receipt amounts, combined with an intelligent multi-turn financial assistant and purchase simulator.

---

## 👥 Team Members & Task Distribution Matrix

Per the course guidelines for teamwork and equitable distribution of work, the responsibilities are distributed among team members as follows:

| Member | Full Name & Contact | Role & Module Responsibilities |
| :--- | :--- | :--- |
| **Member A** | **Trinh Duc Long (Kuma)**<br>• GitHub: [@Kuma984](https://github.com/Kuma984)<br>• Email: `trinhduclong984@gmail.com` | **Team Leader & PWA Core Architect**<br>• Implemented Service Worker App Shell caching strategy (`sw.js` Cache Storage).<br>• Built client-side IndexedDB database layer (`db.js`) and live online/offline heartbeat monitor.<br>• Developed responsive mobile-first UI with cute theme, interactive spending calendar, and chart breakdowns.<br>• Built multi-wallet CRUD management (Cash, Bank, MoMo) with net worth conservation laws.<br>• Configured Web App Manifest (`manifest.webmanifest`) with standalone mobile installation. |
| **Member B** | **Ngoc Tram**<br>• GitHub: [@laconbonglongxien0906-spec](https://github.com/laconbonglongxien0906-spec) | **Backend Core & Database Architect**<br>• Designed relational database schema (`schema.sql`) and PHP RESTful API.<br>• Built session authentication, CSRF protection, and password hashing security.<br>• Developed the two-way idempotent sync engine (`sync-records.php`) and transactional ledger logic.<br>• Coordinated API health heartbeat endpoints and snapshot hydration. |
| **Member C** | **Hoang Anh (Simon)**<br>• Email: `simonhoanganh@gmail.com` | **Hardware Integration, Smart AI Chat & Savings Tools**<br>• Implemented camera hardware access and on-device receipt OCR scanner using Tesseract.js.<br>• Developed multi-turn Smart Financial Assistant (`chat.js`, `chat-answers.js`) with quick-action prompts.<br>• Integrated local LLM connector (`server/ai/ollama.php`) and offline rule-based financial NLU.<br>• Built Purchase Simulator and Savings Wishlist to prevent impulsive buying. |

---

## 🚀 Key Features & Demonstration Highlights

### 1. Progressive Web App (PWA) Implementation (Topic 2 Requirement)
* **Service Worker App Shell:** All critical static assets (HTML, CSS, local fonts, JS modules, icons) are pre-cached in Cache Storage during the `install` phase. The app loads instantly in under 1 second.
* **Installable Native Experience:** Complies with Web App Manifest standards (standalone display mode, maskable icons 192x192 & 512x512). Users can install it directly to their Android / iOS home screen.
* **Dual-Layer Online/Offline Detection:** Combines the browser's `navigator.onLine` events with a dynamic 3.5-second server ping heartbeat. The badge accurately reflects `🟢 Online` $\leftrightarrow$ `🔴 Offline` with instant user feedback toasts.

### 2. Multi-Wallet Ledger & Asset Conservation
* Supports default student wallets (`💵 Tiền mặt` / Cash, `🏦 Ngân hàng` / Bank, `💖 Ví MoMo` / E-wallet) and allows creating, renaming, and deleting custom wallets.
* Supports 3 transaction streams: **Expense (-)**, **Income (+)**, and **Internal Transfer ($\rightleftharpoons$)** adhering strictly to the law of conservation of net assets.
* Filtering dashboard by individual wallets or viewing combined total balances across all accounts.

### 3. Hardware Camera & On-Device AI OCR Scanner
* Direct camera hardware integration via HTML5 Media Capture API.
* Runs **Tesseract.js** directly inside the browser client without transmitting private photos to external cloud services, respecting student privacy and working even when offline.

### 4. Smart Financial AI Assistant & Impulse Purchase Simulator
* **Multi-turn Financial Assistant:** Answers student queries such as *"How much money do I have left?"*, *"What did I spend this month?"*, *"What is my MoMo balance?"*.
* **Dual Engine Architecture:** Online mode connects to Ollama LLM (`llama3.2` / `qwen`); Offline mode smoothly degrades to an on-device rule-based NLU engine (`chat-answers.js`) with zero downtime.
* **Purchase Simulator:** Simulates the daily financial impact if a student purchases an expensive item, warning them of budget overruns before they make the purchase.

---

## 🛠️ Technology Stack

* **Frontend:** Vanilla JavaScript (Modern ES Modules, zero external heavy framework bloat for maximum PWA speed), HTML5 Semantic markup, Modern CSS3 with Flexbox, CSS Grid, and custom CSS variables.
* **PWA & Offline:** Service Worker API (Cache-First App Shell), Web App Manifest, IndexedDB API (`PocketBudgetDB`).
* **Backend:** PHP 8.2+ (PDO, RESTful JSON endpoints, session-based authentication, CSRF tokens, strict SQL prepared statements).
* **Database:** MySQL 8.0+ / MariaDB 10.4+.
* **Hardware & ML:** HTML5 Camera API, Tesseract.js (Client-side Optical Character Recognition).
* **AI Integration:** Ollama API integration (`llama3.2`) with deterministic fallback NLU.

---

## 📋 System Requirements

* **Operating System:** Windows 10/11, macOS, or Linux.
* **Web Server:** PHP >= 8.1 (with extensions enabled: `pdo_mysql`, `curl`, `mbstring`, `session`).
* **Database:** MySQL >= 8.0 or MariaDB >= 10.4 (included in standard XAMPP, WampServer, or Docker).
* **Supported Browsers:** Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari (iOS 16+).
* **Optional:** [Ollama](https://ollama.ai) (optional, if you want local generative LLM responses; otherwise the built-in offline rule engine handles all queries accurately).

---

## 💻 Step-by-Step Setup & Running Guide

### Step 1: Database Setup
1. Start **MySQL** from your XAMPP Control Panel (or start your local MySQL service).
2. Open phpMyAdmin at `http://localhost/phpmyadmin` (or use MySQL command line).
3. Create a new database named `pocketbudget`.
4. Import the provided schema:
   ```bash
   database/schema.sql
   ```

### Step 2: Environment Configuration
Check `server/config.local.php`. If you are using standard XAMPP defaults (username `root`, no password):
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

### Step 3: Launch Application Server
Open a terminal inside the project directory and run the built-in PHP development server:
```bash
php -S 0.0.0.0:8000 -t public
```

### Step 4: Accessing the Application
* **On Desktop:** Open your browser and navigate to:
  ```
  http://localhost:8000
  ```
* **On Mobile Devices (Full PWA Experience):**
  Since Service Workers and Camera APIs require a secure context (HTTPS) when accessed over a network:
  ```bash
  cloudflared tunnel --url http://localhost:8000
  ```
  Open the resulting `https://*.trycloudflare.com` URL on your phone's browser, then tap **"Add to Home Screen"** / **"Install App"**.

---

## 🔑 Demo Credentials (For Grading & Testing)

The database seed provides a pre-configured test account for the instructor and grading team:

* **Email:** `demo@pocketbudget.local`
* **Password:** `pocketbudget123`

*(Alternatively, you can click the **Đăng ký (Register)** tab on the login screen to create a fresh student account; default wallets will be generated automatically).*

---

## 🧪 Instructions for Feature Testing

### Test 1: PWA Installation
1. Open the application on Chrome (Desktop or Android) or Safari (iOS).
2. Observe the browser's install prompt or tap the menu and select **"Install PocketBudget"** / **"Add to Home Screen"**.
3. Launch PocketBudget from the home screen icon. It will open in standalone windowed mode without browser URL bars.

### Test 2: Offline Operation & Sync
1. Log into the app while connected to the internet.
2. Disconnect Wi-Fi or enable **Airplane Mode**.
3. Notice the top status pill immediately switches from `🟢 Online` to `🔴 Offline`.
4. Add a new expense (e.g., `Lunch 35,000 VND`). The transaction appears immediately, and the wallet balance updates in real-time via IndexedDB.
5. Refresh the page (F5) while offline: The application shell and all local data persist seamlessly.
6. Reconnect Wi-Fi: The status switches back to `🟢 Online`, and the pending outbox queue automatically synchronizes with the MySQL database.

### Test 3: Camera OCR Receipt Scanner
1. Go to the Transaction tab and open **Quét hóa đơn (Scan Receipt)**.
2. Grant camera permissions or upload an invoice image.
3. The on-device Tesseract.js engine parses text from the receipt and automatically extracts the total amount into the form.

### Test 4: Smart Financial AI Chatbot
1. Open the **Trợ lý AI** tab.
2. Try asking:
   - *"Hôm nay tôi còn bao nhiêu tiền?"*
   - *"Tháng này đã chi tiêu bao nhiêu?"*
   - *"Ví MoMo của tôi còn bao nhiêu?"*
3. The chatbot calculates precise financial figures directly from your ledger data and provides actionable financial advice.

### Test 5: Automated Testing
Run the backend AI and validation test suites:
```bash
php tests/chat-validation.php
php tests/chat-ollama.php
```
Both test suites should return **`PASS`** with zero errors.

---

## 📁 Repository Structure

```text
pocketbudget/
├── database/
│   └── schema.sql                  # Relational schema (users, wallets, transactions, budgets, wishlist)
├── public/                         # Public Web Root (Served by Web Server)
│   ├── index.html                  # Main Application Shell
│   ├── manifest.webmanifest        # PWA Web App Manifest (Standalone, Icons, Colors)
│   ├── sw.js                       # Service Worker (Cache Storage strategy & offline sync)
│   ├── api/                        # Backend REST API Endpoints
│   │   ├── auth.php                # Authentication (Login, Register, Logout, Session probe)
│   │   ├── chat.php                # AI Financial Assistant endpoint
│   │   ├── health.php              # Server health & connectivity heartbeat
│   │   ├── snapshot.php            # Full user data snapshot hydration
│   │   └── sync.php                # Idempotent two-way synchronization
│   ├── css/                        # Local stylesheets (Layout, Components, Theme, Remixicon)
│   ├── icons/                      # PWA icons (192x192, 512x512 maskable)
│   ├── img/                        # Local static graphic assets & cute cat meme
│   └── js/                         # Modular Frontend Architecture
│       ├── app.js                  # Main controller & navigation router
│       ├── db.js                   # IndexedDB storage layer & outbox queue
│       ├── sync.js                 # Background sync coordinator
│       ├── tesseract.min.js        # On-device OCR engine
│       ├── domain/finance.js       # Financial calculations & asset conservation rules
│       └── modules/                # Application modules:
│           ├── dashboard.js        # Overview, wallet breakdown, charts, calendar
│           ├── transactions.js     # Expense/Income/Transfer CRUD & Camera OCR
│           ├── budget.js           # Monthly budget allocation & alerts
│           ├── chat.js             # Financial AI chat interface
│           ├── chat-answers.js     # Deterministic offline financial rule engine
│           ├── simulation.js       # Impulse purchase simulator
│           └── wishlist.js         # Savings goals & wishlist management
├── server/                         # Server-side business logic
│   ├── bootstrap.php               # Database connection pool & security bootstrap
│   ├── config.local.php            # Local configuration (MySQL & Ollama parameters)
│   ├── seed.php                    # Database seeder for demo account
│   ├── sync-records.php            # Transactional sync handler with deduplication
│   └── ai/                         # AI assistant handlers & JSON schema validation
└── tests/                          # Automated test suites
    ├── chat-validation.php         # Tests for intent classification & safety
    ├── chat-ollama.php             # Tests for Ollama connector & mock responses
    ├── finance.test.js             # Unit tests for financial formulas
    ├── member-c.test.js            # Integration tests for Member C modules
    └── pwa-integration.test.js     # End-to-end PWA flow tests
```

---

## 📜 Academic Integrity Statement

This project was developed by the student team for the Midterm Evaluation in **Web Programming & Applications (Course 503073)** at **Ton Duc Thang University**. All code files in `public/`, `server/`, `database/`, and `tests/` represent the genuine work of our team members according to the distributed tasks.
