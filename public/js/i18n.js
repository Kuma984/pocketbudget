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

    // Budget Screen
    budget_mgmt_title: "Cài đặt & Quản lý Ngân sách Tháng",
    budget_mgmt_desc: "Thiết lập hạn mức chi tiêu để kiểm soát tài chính sinh viên thông minh và nhận cảnh báo khi bội chi.",
    current_month_limit: "Hạn mức tháng hiện tại ({month})",
    max_limit_label: "Hạn mức tối đa (VNĐ):",
    limit_placeholder: "Ví dụ: 3000000",
    btn_save_budget: "Lưu Ngân Sách",
    budget_history_title: "Lịch sử ngân sách các tháng",
    th_month: "Tháng",
    th_limit: "Hạn mức (VNĐ)",
    th_spent: "Đã chi (VNĐ)",
    th_status: "Tình trạng",
    status_in_control: "Trong tầm kiểm soát ({pct}%)",
    status_warning: "Cảnh báo ngân sách ({pct}%)",
    status_over: "Vượt ngân sách ({pct}%)",
    status_unset: "Chưa đặt hạn mức",
    remaining_budget_label: "Ngân sách còn lại",
    over_budget_label: "Vượt ngân sách",
    zero_budget_label: "Còn đúng 0đ",
    formula_desc: "= hạn mức {limit} − đã chi {spent}",

    // Simulation Screen
    sim_header_title: "Mô phỏng trước khi mua",
    sim_header_desc: "Xem số dư và ngân sách thay đổi thế nào nếu mua món này. Mô phỏng không ghi vào sổ.",
    sim_mode_empty: "Chưa có số liệu. Tự nhập giả định, hoặc bấm “Lấy từ sổ trên máy”.",
    sim_mode_ledger: "Đang dùng số liệu thật từ sổ trên máy.",
    sim_mode_sample: "Đang dùng số liệu mẫu, không phải dữ liệu của bạn.",
    sim_mode_manual: "Đang dùng số liệu giả định do bạn nhập.",
    sim_item_label: "Tên món",
    sim_item_placeholder: "Ví dụ: Tai nghe",
    sim_price_label: "Giá món (đ)",
    sim_balance_label: "Số dư hiện tại (đ)",
    sim_balance_placeholder: "Tiền thật đang có",
    sim_budget_label: "Ngân sách còn lại (đ)",
    sim_budget_placeholder: "Hạn mức − đã chi tháng này",
    sim_days_label: "Số ngày còn lại",
    sim_reserved_label: "Tiền muốn giữ riêng (đ)",
    sim_btn_calc: "Tính thử",
    sim_btn_local: "Lấy từ sổ trên máy",
    sim_btn_sample: "Thử số liệu mẫu",

    // Wishlist Screen
    wishlist_header_title: "Danh sách chờ mua",
    wishlist_header_desc: "Lưu món muốn mua và chọn ngày xem lại. Đưa món vào danh sách chưa làm thay đổi số dư.",
    wishlist_source_note: "Danh sách đọc từ thiết bị này.",
    wishlist_item_name: "Tên món",
    wishlist_price_label: "Giá dự kiến (đ)",
    wishlist_review_label: "Ngày xem lại",
    wishlist_btn_add: "Thêm món",
    wishlist_btn_save_edit: "Lưu chỉnh sửa",
    wishlist_btn_cancel_edit: "Bỏ chỉnh sửa",
    wishlist_empty: "Chưa có món nào trong danh sách. Thêm món ở trên hoặc từ màn Mô phỏng.",
    wishlist_status_considering: "Đang chờ",
    wishlist_status_bought: "Đã mua",
    wishlist_status_skipped: "Bỏ qua",
    wishlist_due_badge: "Đến ngày xem lại",
    wishlist_btn_edit: "Sửa",
    wishlist_btn_sim: "Mô phỏng",
    wishlist_btn_buy: "Đã mua…",
    wishlist_btn_skip: "Bỏ qua",

    // AI Assistant Screen
    chat_header_title: "Trợ lý AI",
    chat_header_desc: "Hỏi về số dư, thu chi, ngân sách, thử một khoản mua hoặc tạo bản nháp. Chatbot chạy local qua máy chủ của nhóm và không tự lưu giao dịch.",
    chat_input_label: "Câu hỏi của bạn",
    chat_placeholder: "Ví dụ: Tôi còn bao nhiêu tiền?",
    chat_guide_title: "Cách dùng chatbot",
    chat_sample_1_label: "Hỏi số dư",
    chat_sample_1_text: "Tôi còn bao nhiêu tiền?",
    chat_sample_2_label: "Hỏi tổng chi",
    chat_sample_2_text: "Tháng này chi ăn uống bao nhiêu?",
    chat_sample_3_label: "Mô phỏng khoản mua",
    chat_sample_3_text: "Mô phỏng mua tai nghe 400k.",
    chat_sample_4_label: "Tạo bản nháp",
    chat_sample_4_text: "Tạo bản nháp chi 45k ăn trưa hôm nay.",
    chat_btn_send: "Gửi câu hỏi",
    chat_btn_new: "Cuộc trò chuyện mới",
    chat_btn_manual_sim: "Mở mô phỏng thủ công",

    // System Screen
    sys_auth_title: "Xác thực Tài khoản",
    sys_auth_desc: "Hệ thống hỗ trợ làm việc Ngoại tuyến (Offline-First) và Đăng nhập để đồng bộ đám mây.",
    sys_logged_in_as: "Đang đăng nhập với tư cách:",
    sys_btn_logout: "Đăng xuất",
    sys_login_title: "Đăng nhập",
    sys_register_title: "Đăng ký tài khoản mới",
    sys_email_label: "Email đăng nhập",
    sys_pwd_label: "Mật khẩu",
    sys_name_label: "Họ và tên",
    sys_btn_login: "Đăng nhập ngay",
    sys_btn_register: "Đăng ký",
    sys_outbox_title: "Hàng đợi Ngoại tuyến (Offline Outbox Queue)",
    sys_btn_sync_now: "Đồng bộ ngay bây giờ",

    // Modals
    budget_modal_title: "Thiết lập Ngân sách Tháng",
    budget_modal_desc: "Nhập số tiền tối đa bạn muốn chi tiêu cho tháng này:",
    save_budget_btn: "Lưu ngân sách",

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

    // Budget Screen
    budget_mgmt_title: "Monthly Budget Settings & Management",
    budget_mgmt_desc: "Set spending limits to manage student finances intelligently and get alert on overspending.",
    current_month_limit: "Current Month Budget ({month})",
    max_limit_label: "Maximum Limit (VND):",
    limit_placeholder: "e.g. 3000000",
    btn_save_budget: "Save Budget",
    budget_history_title: "Monthly Budget History",
    th_month: "Month",
    th_limit: "Limit (VND)",
    th_spent: "Spent (VND)",
    th_status: "Status",
    status_in_control: "Under control ({pct}%)",
    status_warning: "Budget warning ({pct}%)",
    status_over: "Over budget ({pct}%)",
    status_unset: "Limit not set",
    remaining_budget_label: "Remaining budget",
    over_budget_label: "Over budget",
    zero_budget_label: "Exactly 0đ left",
    formula_desc: "= limit {limit} − spent {spent}",

    // Simulation Screen
    sim_header_title: "Purchase Simulation",
    sim_header_desc: "See how your balance and budget change if you buy this item. Simulations are not saved as transactions.",
    sim_mode_empty: "No data yet. Enter assumed figures or tap “Use local ledger”.",
    sim_mode_ledger: "Using actual figures from your local ledger.",
    sim_mode_sample: "Using sample figures, not your actual data.",
    sim_mode_manual: "Using assumed figures entered by you.",
    sim_item_label: "Item Name",
    sim_item_placeholder: "e.g. Headphones",
    sim_price_label: "Item Price (VND)",
    sim_balance_label: "Current Balance (VND)",
    sim_balance_placeholder: "Actual available funds",
    sim_budget_label: "Remaining Budget (VND)",
    sim_budget_placeholder: "Monthly limit − spent this month",
    sim_days_label: "Days Left in Month",
    sim_reserved_label: "Reserved Safety Cushion (VND)",
    sim_btn_calc: "Run Simulation",
    sim_btn_local: "Use local ledger",
    sim_btn_sample: "Try sample data",

    // Wishlist Screen
    wishlist_header_title: "Savings Wishlist",
    wishlist_header_desc: "Save items you plan to buy and pick a review date. Adding an item does not affect your balance.",
    wishlist_source_note: "List read from this device.",
    wishlist_item_name: "Item Name",
    wishlist_price_label: "Estimated Price (VND)",
    wishlist_review_label: "Review Date",
    wishlist_btn_add: "Add Item",
    wishlist_btn_save_edit: "Save Changes",
    wishlist_btn_cancel_edit: "Cancel Edit",
    wishlist_empty: "No items in your wishlist yet. Add an item above or from the Simulation screen.",
    wishlist_status_considering: "Considering",
    wishlist_status_bought: "Bought",
    wishlist_status_skipped: "Skipped",
    wishlist_due_badge: "Due for review",
    wishlist_btn_edit: "Edit",
    wishlist_btn_sim: "Simulate",
    wishlist_btn_buy: "Bought…",
    wishlist_btn_skip: "Skip",

    // AI Assistant Screen
    chat_header_title: "AI Assistant",
    chat_header_desc: "Ask about balance, expenses, budget, test a purchase, or draft a transaction. Bot runs locally and never saves transactions without confirmation.",
    chat_input_label: "Your Question",
    chat_placeholder: "e.g., How much money do I have left?",
    chat_guide_title: "How to use the assistant",
    chat_sample_1_label: "Check Balance",
    chat_sample_1_text: "How much money do I have left?",
    chat_sample_2_label: "Check Spending",
    chat_sample_2_text: "How much did I spend on food this month?",
    chat_sample_3_label: "Simulate Purchase",
    chat_sample_3_text: "Simulate buying headphones for 400k.",
    chat_sample_4_label: "Draft Expense",
    chat_sample_4_text: "Draft 45k lunch expense for today.",
    chat_btn_send: "Send Question",
    chat_btn_new: "New Chat",
    chat_btn_manual_sim: "Open Manual Simulator",

    // System Screen
    sys_auth_title: "Account Authentication",
    sys_auth_desc: "Supports Offline-First operations and Cloud Synchronization when logged in.",
    sys_logged_in_as: "Logged in as:",
    sys_btn_logout: "Log out",
    sys_login_title: "Log In",
    sys_register_title: "Register New Account",
    sys_email_label: "Email Address",
    sys_pwd_label: "Password",
    sys_name_label: "Full Name",
    sys_btn_login: "Log In Now",
    sys_btn_register: "Sign Up",
    sys_outbox_title: "Offline Outbox Queue",
    sys_btn_sync_now: "Synchronize Now",

    // Modals
    budget_modal_title: "Set Monthly Budget",
    budget_modal_desc: "Enter the maximum amount you plan to spend this month:",
    save_budget_btn: "Save Budget",

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
