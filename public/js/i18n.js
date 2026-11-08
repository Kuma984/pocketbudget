// PocketBudget i18n — Internationalization Engine (Tiếng Việt & English)

const TRANSLATIONS = {
  vi: {
    // Topbar & Onboarding
    welcome_student: "Chào mừng bạn học sinh!",
    enter_name_prompt: "Nhập tên của bạn để Mèo con nhận diện chủ nhân nhé:",
    name_placeholder: "Nhập tên của bạn (vd: Trâm, Long)...",
    start_now: "Bắt đầu ngay",
    hello_user: "Chào {name} 👋",
    hello_generic: "Chào Bạn 👋",
    today_label: "Hôm nay:",
    no_expense_today: "Chưa chi tiêu",
    spent_today: "Đã chi {amount}",
    streak_suffix: "{count} ngày streak",
    set_budget: "Đặt Ngân Sách",
    sync: "Đồng bộ",
    syncing: "Đang đồng bộ...",
    online: "Online",
    offline: "Offline",
    reconnected_toast: "🟢 Đã kết nối lại mạng (Online)",
    offline_toast: "🔴 Đang ở chế độ Ngoại tuyến (Offline)",
    cat_alert: "COI MÁ NÀY SÀI TIỀN KÌA TRỜI 😭",
    
    // Navigation Tabs
    nav_dashboard: "Tổng quan",
    nav_transactions: "Thu chi",
    nav_budget: "Ngân sách",
    nav_simulation: "Mô phỏng",
    nav_wishlist: "Chờ mua",
    nav_chat: "Trợ lý AI",
    nav_system: "Máy chủ",

    // Dashboard
    hero_remaining_budget: "Ngân sách còn lại tháng này",
    hero_daily_allowance: "Mức chi an toàn mỗi ngày:",
    hero_all_wallets: "Số dư hiện tại (tất cả {count} ví)",
    hero_single_wallet: "Số dư hiện tại ({name})",
    all_wallets_tab: "Tất cả ví",
    calendar_title: "Lướt xem nhật ký khoảnh khắc & chi tiêu các tháng 📸",
    weekly_chart_title: "Chi tiêu 7 ngày qua",
    donut_chart_title: "Phân bổ chi tiêu danh mục",
    recent_transactions: "Nhật ký giao dịch gần đây",
    no_tx_history: "Chưa có giao dịch nào được ghi nhận.",

    // Transactions / Wallets
    wallet_mgmt_title: "Quản lý các Ví & Tổng tài sản",
    total_net_worth: "Tổng tài sản ròng:",
    transfer_note: "* Thao tác Chuyển tiền giữa 2 ví không làm thay đổi tổng tài sản.",
    create_wallet_title: "Tạo thêm ví mới",
    wallet_name_placeholder: "Tên ví (vd: Tiền mặt, Techcombank, MoMo)",
    wallet_balance_placeholder: "Số dư ban đầu",
    btn_add_wallet: "Thêm ví",
    tab_expense: "Khoản chi (-)",
    tab_income: "Khoản thu (+)",
    tab_transfer: "Chuyển ví (⇄)",
    source_wallet_label: "Nguồn ví thanh toán",
    target_wallet_label: "Ví nhận tiền",
    amount_label: "Số tiền (VNĐ)",
    category_label: "Danh mục chi tiêu",
    description_label: "Nội dung / Món ăn / Nguồn thu",
    btn_save_tx: "Lưu giao dịch",
    btn_update_tx: "Cập nhật giao dịch",
    btn_cancel: "Hủy bỏ",
    btn_scan_receipt: "Quét hóa đơn bằng Camera (AI OCR)",
    btn_floating_scan: "Chụp Hóa Đơn AI",

    // Budget & Alerts
    budget_modal_title: "Thiết lập Ngân sách Tháng",
    budget_modal_desc: "Nhập số tiền tối đa bạn muốn chi tiêu cho tháng này:",
    save_budget_btn: "Lưu ngân sách",
    budget_saved_toast: "Đã cập nhật ngân sách thành công! 🎉",

    // Purchase Simulation
    sim_title: "Mô phỏng tác động chi tiêu",
    sim_desc: "Đánh giá khả năng tài chính trước khi mua một món đồ đắt tiền.",
    sim_price_label: "Giá tiền món đồ định mua (VNĐ)",
    sim_run_btn: "Chạy mô phỏng ngay",

    // Wishlist
    wishlist_title: "Danh sách Chờ mua (Tiết kiệm có kỷ luật)",
    wishlist_desc: "Trì hoãn mua sắm ngẫu hứng để kiểm tra xem bạn có thực sự cần món đồ này không.",
    wishlist_item_name: "Tên món đồ mơ ước",
    wishlist_price: "Giá dự kiến",
    wishlist_add_btn: "Thêm vào danh sách chờ",

    // AI Assistant
    chat_title: "Trợ lý Tài chính Sinh viên Thông minh",
    chat_quick_1: "Tôi còn bao nhiêu tiền?",
    chat_quick_2: "Tháng này chi tiêu gì nhiều nhất?",
    chat_quick_3: "Ví MoMo còn lại bao nhiêu?",
    chat_placeholder: "Hỏi trợ lý (vd: Tôi còn bao nhiêu tiền, Tháng này chi gì?)...",
    chat_send: "Gửi câu hỏi",

    // Language toggle button label
    lang_btn_text: "EN"
  },

  en: {
    // Topbar & Onboarding
    welcome_student: "Welcome, Student!",
    enter_name_prompt: "Enter your name so the Kitten can recognize its owner:",
    name_placeholder: "Enter your name (e.g. Tram, Long)...",
    start_now: "Get Started",
    hello_user: "Hello {name} 👋",
    hello_generic: "Hello Friend 👋",
    today_label: "Today:",
    no_expense_today: "No expenses",
    spent_today: "Spent {amount}",
    streak_suffix: "{count} day streak",
    set_budget: "Set Budget",
    sync: "Sync",
    syncing: "Syncing...",
    online: "Online",
    offline: "Offline",
    reconnected_toast: "🟢 Reconnected to server (Online)",
    offline_toast: "🔴 Operating in Offline Mode",
    cat_alert: "LOOK AT HOW MUCH YOU SPENT! 😭",

    // Navigation Tabs
    nav_dashboard: "Dashboard",
    nav_transactions: "Transactions",
    nav_budget: "Budget",
    nav_simulation: "Simulation",
    nav_wishlist: "Wishlist",
    nav_chat: "AI Assistant",
    nav_system: "System",

    // Dashboard
    hero_remaining_budget: "Remaining budget this month",
    hero_daily_allowance: "Safe daily allowance:",
    hero_all_wallets: "Current balance (all {count} wallets)",
    hero_single_wallet: "Current balance ({name})",
    all_wallets_tab: "All Wallets",
    calendar_title: "Browse photo journal & monthly spending logs 📸",
    weekly_chart_title: "Spending in the last 7 days",
    donut_chart_title: "Spending by Category",
    recent_transactions: "Recent Transactions",
    no_tx_history: "No transactions recorded yet.",

    // Transactions / Wallets
    wallet_mgmt_title: "Wallet Management & Net Worth",
    total_net_worth: "Total Net Worth:",
    transfer_note: "* Internal transfers between wallets do not change total net worth.",
    create_wallet_title: "Create New Wallet",
    wallet_name_placeholder: "Wallet name (e.g. Cash, Techcombank, MoMo)",
    wallet_balance_placeholder: "Initial balance",
    btn_add_wallet: "Add Wallet",
    tab_expense: "Expense (-)",
    tab_income: "Income (+)",
    tab_transfer: "Transfer (⇄)",
    source_wallet_label: "Source Wallet",
    target_wallet_label: "Destination Wallet",
    amount_label: "Amount (VND)",
    category_label: "Category",
    description_label: "Description / Memo",
    btn_save_tx: "Save Transaction",
    btn_update_tx: "Update Transaction",
    btn_cancel: "Cancel",
    btn_scan_receipt: "Scan Receipt via Camera (AI OCR)",
    btn_floating_scan: "Scan Receipt AI",

    // Budget & Alerts
    budget_modal_title: "Set Monthly Budget",
    budget_modal_desc: "Enter the maximum amount you plan to spend this month:",
    save_budget_btn: "Save Budget",
    budget_saved_toast: "Budget updated successfully! 🎉",

    // Purchase Simulation
    sim_title: "Purchase Impact Simulator",
    sim_desc: "Evaluate your financial health before making an expensive purchase.",
    sim_price_label: "Proposed purchase price (VND)",
    sim_run_btn: "Run Simulation",

    // Wishlist
    wishlist_title: "Savings Wishlist (Disciplined Spending)",
    wishlist_desc: "Delay impulsive purchases to evaluate if you truly need this item.",
    wishlist_item_name: "Item name",
    wishlist_price: "Estimated price",
    wishlist_add_btn: "Add to Wishlist",

    // AI Assistant
    chat_title: "Smart Student Financial Assistant",
    chat_quick_1: "How much money do I have left?",
    chat_quick_2: "What was my highest expense this month?",
    chat_quick_3: "What is my MoMo wallet balance?",
    chat_placeholder: "Ask assistant (e.g., How much do I have left?)...",
    chat_send: "Send message",

    // Language toggle button label
    lang_btn_text: "VI"
  }
};

let currentLang = localStorage.getItem('pocketbudget_lang') || 'vi';

export function getLang() {
  return currentLang;
}

export function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.vi;
  let text = dict[key] || TRANSLATIONS.vi[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

export function setLanguage(lang) {
  if (lang !== 'vi' && lang !== 'en') lang = 'vi';
  currentLang = lang;
  localStorage.setItem('pocketbudget_lang', lang);
  updateStaticDOM();
}

export function toggleLanguage() {
  const nextLang = currentLang === 'vi' ? 'en' : 'vi';
  setLanguage(nextLang);
  return nextLang;
}

export function updateStaticDOM() {
  // Update App Nav
  const navMap = {
    '#dashboard': 'nav_dashboard',
    '#transactions': 'nav_transactions',
    '#budget': 'nav_budget',
    '#simulation': 'nav_simulation',
    '#wishlist': 'nav_wishlist',
    '#chat': 'nav_chat',
    '#system': 'nav_system'
  };

  document.querySelectorAll('nav.app-nav a').forEach(a => {
    const href = a.getAttribute('href');
    const key = navMap[href];
    if (key) {
      const icon = a.querySelector('i');
      const iconHtml = icon ? icon.outerHTML : '';
      a.innerHTML = `${iconHtml} ${t(key)}`;
    }
  });

  // Update Topbar buttons
  const btnBudget = document.getElementById('btnOpenBudgetModal');
  if (btnBudget) {
    btnBudget.innerHTML = `<i class="ri-settings-4-line"></i> ${t('set_budget')}`;
  }

  const syncText = document.getElementById('syncStatusHeader');
  if (syncText) {
    syncText.textContent = t('sync');
  }

  const btnLang = document.getElementById('langLabel');
  if (btnLang) {
    btnLang.textContent = t('lang_btn_text');
  }

  const catAlertBubble = document.querySelector('.cat-speech-bubble-pop');
  if (catAlertBubble) {
    catAlertBubble.textContent = t('cat_alert');
  }

  // Update Budget Modal
  const modalTitle = document.querySelector('#budgetModal h2');
  if (modalTitle) modalTitle.textContent = t('budget_modal_title');
  const modalDesc = document.querySelector('#budgetModal p');
  if (modalDesc) modalDesc.textContent = t('budget_modal_desc');
  const btnSaveBudget = document.getElementById('btnSaveBudget');
  if (btnSaveBudget) btnSaveBudget.innerHTML = `<i class="ri-check-line"></i> ${t('save_budget_btn')}`;

  // Update Floating Action Button
  const btnFab = document.getElementById('fabScanBtn');
  if (btnFab) {
    btnFab.innerHTML = `<i class="ri-camera-lens-fill"></i> ${t('btn_floating_scan')}`;
  }
}
