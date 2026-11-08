// App.js - Điểm điều phối ứng dụng PocketBudget (Cute Cat Meme Edition)
// Tích hợp toàn diện Thành viên A (Core & Backend), Thành viên B (PWA & Dashboard), Thành viên C (Simulation & AI)
import { render as dashboard } from './modules/dashboard.js';
import { render as transactions } from './modules/transactions.js';
import { render as budget } from './modules/budget.js';
import { render as simulation } from './modules/simulation.js';
import { render as wishlist } from './modules/wishlist.js';
import { render as chat } from './modules/chat.js';
import { render as system } from './modules/system.js';

import { listRecords, saveAndQueue, generateClientUuid } from './db.js';
import { pullSnapshot, syncNow } from './sync.js';
import { getAppSession, GUEST_USER_ID } from './modules/c-context.js';
import { todayLocal } from './modules/c-tools.js';

let currentImageData = null;
let catTimer = null;
let currentUser = null;


const routes = { dashboard, transactions, budget, simulation, wishlist, chat, system };

// ==========================================
// 1. KHỞI CHẠY KHI TẢI TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await fetchCurrentUser();
  checkOnboarding();
  updateTopBarInfo();
  setupEventListeners();
  setupCameraAndOCR();
  registerServiceWorker();
  route();
  if (currentUser && navigator.onLine) {
    try {
      await pullSnapshot(currentUser.id);
      route();
    } catch (error) {
      if (!(error instanceof TypeError)) showToast('Chưa tải được dữ liệu máy chủ: ' + error.message);
    }
  }
});

// Lấy thông tin user phiên làm việc nếu có
async function fetchCurrentUser() {
  currentUser = (await getAppSession())?.user ?? null;
}

// ==========================================
// 2. ONBOARDING & TOPBAR
// ==========================================
function checkOnboarding() {
  const localName = localStorage.getItem('student_name');
  const modal = document.getElementById('onboardModal');

  if (currentUser && currentUser.name) {
    if (!localName) localStorage.setItem('student_name', currentUser.name);
    modal.style.display = 'none';
    document.getElementById('userHeaderName').textContent = `Chào ${currentUser.name} 👋`;
    return;
  }

  if (!localName || localName.trim() === '') {
    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
    document.getElementById('userHeaderName').textContent = `Chào ${localName} 👋`;
  }
}

function saveUserName() {
  const nameInput = document.getElementById('userNameInput');
  const name = nameInput.value.trim();
  if (name !== '') {
    localStorage.setItem('student_name', name);
    document.getElementById('userHeaderName').textContent = `Chào ${name} 👋`;
    document.getElementById('onboardModal').style.display = 'none';
    showToast(`Chào mừng ${name} đến với PocketBudget! ✨`);
  } else {
    alert('Vui lòng nhập tên của bạn nhé!');
  }
}

async function updateTopBarInfo() {
  // Cập nhật streak
  const streak = localStorage.getItem('pb_streak_count') || '1';
  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = streak;

  // Cập nhật trạng thái chi tiêu hôm nay
  const userId = currentUser?.id ?? GUEST_USER_ID;
  try {
    const txs = await listRecords('transactions', userId);
    const todayStr = todayLocal();
    let todayExp = 0;
    txs.forEach(t => {
      const isExpense = t.type === 'expense';
      const d = t.occurred_on || (t.date ? t.date.split('T')[0] : '');
      if (isExpense && d === todayStr) {
        todayExp += Number(t.amount_vnd || t.amount || 0);
      }
    });

    const todayStatusEl = document.getElementById('todayExpenseStatus');
    if (todayStatusEl) {
      if (todayExp > 0) {
        todayStatusEl.textContent = `Đã chi ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(todayExp)}`;
        todayStatusEl.style.color = 'var(--danger)';
      } else {
        todayStatusEl.textContent = 'Chưa chi tiêu';
        todayStatusEl.style.color = 'var(--primary)';
      }
    }
  } catch (e) {
    // offline or loading
  }
}

// ==========================================
// 3. ĐIỀU HƯỚNG (ROUTER)
// ==========================================
function route() {
  const raw = location.hash.slice(1) || 'dashboard';
  const name = Object.hasOwn(routes, raw) ? raw : 'dashboard';

  const container = document.getElementById('content');
  if (container) {
    container.innerHTML = '';
    // An older async render must not paint over a newer route.
    const page = document.createElement('div');
    container.append(page);
    Promise.resolve(routes[name](page)).catch(error => {
      if (page.isConnected) page.textContent = error.message;
    });
  }

  document.querySelectorAll('nav.app-nav a').forEach(a => {
    if (a.getAttribute('href') === `#${name}`) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });

  updateTopBarInfo();
}

window.addEventListener('hashchange', route);

// Theo dõi mạng
function updateNetworkStatus() {
  const netEl = document.getElementById('network');
  if (!netEl) return;
  if (navigator.onLine) {
    netEl.style.background = netEl.style.color = '';
    netEl.setAttribute('data-state', 'online');
    netEl.innerHTML = '<i class="ri-wifi-line"></i> Online';
  } else {
    netEl.setAttribute('data-state', 'offline');
    netEl.innerHTML = '<i class="ri-wifi-off-line"></i> Offline';
    netEl.style.background = 'var(--danger-light)';
    netEl.style.color = 'var(--danger)';
  }
}
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

// ==========================================
// 4. POPUP CON MÈO NHÀO RA KHI XÀI LỐ
// ==========================================
export function triggerCatAlertPopup() {
  const popup = document.getElementById('catAlertOverlay');
  if (!popup) return;
  popup.classList.add('show');

  if (catTimer) clearTimeout(catTimer);
  catTimer = setTimeout(() => {
    closeCatAlert();
  }, 5000); // 5 giây tự ẩn
}

export function closeCatAlert() {
  const popup = document.getElementById('catAlertOverlay');
  if (popup) popup.classList.remove('show');
  if (catTimer) clearTimeout(catTimer);
}

// ==========================================
// 5. MODAL ĐẶT NGÂN SÁCH THÁNG
// ==========================================
async function openBudgetModal() {
  const userId = currentUser?.id ?? GUEST_USER_ID;
  const month = todayLocal().slice(0, 7);
  const budget = (await listRecords('budgets', userId)).find(b => b.month === month);
  const current = budget?.limit_vnd ?? '';
  const input = document.getElementById('monthlyBudgetInput');
  if (input) input.value = current;
  const modal = document.getElementById('budgetModal');
  if (modal) modal.classList.add('show');
}

function closeBudgetModal() {
  const modal = document.getElementById('budgetModal');
  if (modal) modal.classList.remove('show');
}

async function saveMonthlyBudget() {
  const val = Number(document.getElementById('monthlyBudgetInput').value);
  if (!Number.isSafeInteger(val) || val <= 0) return showToast('Nhập hạn mức nguyên dương.');
  const userId = currentUser?.id ?? GUEST_USER_ID;
  const month = todayLocal().slice(0, 7);
  try {
    const budget = (await listRecords('budgets', userId)).find(b => b.month === month);
    await saveAndQueue({ user_id: userId, entity: 'budget', action: 'upsert',
      record: { id: budget?.id ?? generateClientUuid(), month, limit_vnd: val } });
    closeBudgetModal();
    showToast('Đã lưu ngân sách trên thiết bị.');
    route();
  } catch (error) { showToast(error.message); }
}

// ==========================================
// 6. CAMERA NỔI & AI OCR QUÉT HÓA ĐƠN
// ==========================================
async function populateWalletDropdown() {
  const select = document.getElementById('photoWallet');
  if (!select) return;
  select.innerHTML = '';

  const userId = currentUser?.id ?? GUEST_USER_ID;
  const wallets = await listRecords('wallets', userId);

  wallets.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.name;
    opt.setAttribute('data-name', w.name);
    select.appendChild(opt);
  });
}

function setupCameraAndOCR() {
  const openCamBtn = document.getElementById('openCamBtn');
  const closeCamBtn = document.getElementById('closeCamBtn');
  const btnCancelCam = document.getElementById('btnCancelCam');
  const cameraModal = document.getElementById('cameraModal');
  const btnChooseImage = document.getElementById('btnChooseImage');
  const imageInput = document.getElementById('imageInput');
  const photoPreview = document.getElementById('photoPreview');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const scanOverlay = document.getElementById('scanOverlay');
  const scanBadge = document.getElementById('scanBadge');
  const photoTxForm = document.getElementById('photoTxForm');

  if (openCamBtn) {
    openCamBtn.onclick = async () => {
      await populateWalletDropdown();
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      document.getElementById('selectedDateInput').value = dateStr;
      document.getElementById('modalHeaderTitle').innerHTML = `<i class="ri-camera-lens-line"></i> Thêm giao dịch & Khoảnh khắc hôm nay`;
      cameraModal.classList.add('show');
    };
  }

  function closeCameraModal() {
    cameraModal.classList.remove('show');
    photoTxForm.reset();
    photoPreview.style.display = 'none';
    cameraPlaceholder.style.display = 'block';
    scanBadge.textContent = '';
    currentImageData = null;
  }

  if (closeCamBtn) closeCamBtn.onclick = closeCameraModal;
  if (btnCancelCam) btnCancelCam.onclick = closeCameraModal;

  if (btnChooseImage && imageInput) {
    btnChooseImage.onclick = () => imageInput.click();
    imageInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        currentImageData = evt.target.result;
        photoPreview.src = currentImageData;
        photoPreview.style.display = 'block';
        cameraPlaceholder.style.display = 'none';

        scanOverlay.style.display = 'flex';
        scanBadge.textContent = '(Đang quét hóa đơn AI...)';

        if (typeof Tesseract !== 'undefined') {
          Tesseract.recognize(currentImageData, 'eng+vie')
            .then(({ data: { text } }) => {
              scanOverlay.style.display = 'none';
              const numbers = text.match(/\b\d{1,3}(?:[.,]\d{3})*(?:\s*đ|\s*VND)?\b/gi);
              let detected = 0;

              if (numbers) {
                numbers.forEach(numStr => {
                  const cleanNum = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
                  if (cleanNum >= 1000 && cleanNum > detected && cleanNum < 500000000) {
                    detected = cleanNum;
                  }
                });
              }

              if (detected > 0) {
                document.getElementById('photoAmount').value = detected;
                scanBadge.textContent = '✨ Nhận diện được: ' + new Intl.NumberFormat('vi-VN').format(detected) + ' đ';
              } else {
                scanBadge.textContent = '(Chưa nhận diện được giá bill, hãy nhập tay)';
              }
            })
            .catch(() => {
              scanOverlay.style.display = 'none';
              scanBadge.textContent = '(Nhập tay số tiền)';
            });
        } else {
          scanOverlay.style.display = 'none';
          scanBadge.textContent = '(Ảnh đã được đính kèm)';
        }
      };
      reader.readAsDataURL(file);
    };
  }

  if (photoTxForm) {
    photoTxForm.onsubmit = async (e) => {
      e.preventDefault();

      const amount = Number(document.getElementById('photoAmount').value);
      const title = document.getElementById('photoTitle').value.trim();
      const type = photoTxForm.elements['photoType'].value;
      const categoryName = photoTxForm.elements['photoCat'].value;
      const walletSelect = document.getElementById('photoWallet');
      const walletId = walletSelect.value;
      const walletName = walletSelect.selectedOptions[0]?.textContent || 'Ví tiền mặt';
      const customDate = document.getElementById('selectedDateInput').value;

      const dateStr = customDate || todayLocal();
      const isoDate = new Date(dateStr + 'T12:00:00').toISOString();

      const userId = currentUser?.id ?? GUEST_USER_ID;

      // Mã hóa category theo danh mục Member A
      const catMap = {
        'Ăn uống': 'food',
        'Học tập': 'study',
        'Xe cộ': 'transport',
        'Nhà ở': 'other_expense',
        'Giải trí': 'entertainment',
        'Thu nhập': 'salary'
      };
      const categoryCode = type === 'income' ? 'other_income' :
        (categoryName === 'Thu nhập' ? 'other_expense' : (catMap[categoryName] || 'food'));
      if (!walletId) return showToast('Tạo hoặc đồng bộ ví ở màn Thu chi trước.');
      if (!Number.isSafeInteger(amount) || amount <= 0) return showToast('Nhập số tiền nguyên dương.');

      // Tạo transaction record tương thích song song cả Thành viên A & Thành viên B
      const txRecord = {
        id: generateClientUuid(),
        user_id: String(userId),
        wallet_id: walletId,
        wallet: walletName,
        destination_wallet_id: null,
        type: type,
        amount_vnd: amount,
        amount: amount,
        category_code: categoryCode,
        category: categoryName,
        occurred_on: dateStr,
        date: isoDate,
        note: title,
        title: title,
        image: currentImageData,
        version: 1,
        updated_at: new Date().toISOString()
      };

      try {
        await saveAndQueue({ user_id: userId, entity: 'transaction', action: 'upsert', record: txRecord });
      } catch (error) { return showToast(error.message); }

      closeCameraModal();
      showToast('Đã lưu khoảnh khắc & chi tiêu!');

      // Hiệu ứng tương tác:
      if (type === 'income') {
        triggerRainCoinsEffect();
      } else {
        // Khi chi tiêu >= 100k -> Bật popup con mèo
        if (amount >= 100000) {
          triggerCatAlertPopup();
        }
      }

      route();
    };
  }
}

// ==========================================
// 7. SETUP EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  const btnSaveName = document.getElementById('btnSaveName');
  if (btnSaveName) btnSaveName.onclick = saveUserName;

  const nameInput = document.getElementById('userNameInput');
  if (nameInput) {
    nameInput.onkeypress = (e) => {
      if (e.key === 'Enter') saveUserName();
    };
  }

  const btnCloseCat = document.getElementById('btnCloseCatAlert');
  if (btnCloseCat) btnCloseCat.onclick = closeCatAlert;

  const btnOpenBudget = document.getElementById('btnOpenBudgetModal');
  if (btnOpenBudget) btnOpenBudget.onclick = () => void openBudgetModal().catch(error => showToast(error.message));

  const btnCloseBudget = document.getElementById('closeBudgetBtn');
  if (btnCloseBudget) btnCloseBudget.onclick = closeBudgetModal;

  const btnSaveBud = document.getElementById('btnSaveBudget');
  if (btnSaveBud) btnSaveBud.onclick = saveMonthlyBudget;

  const btnCloseDayDetail = document.getElementById('closeDayDetailBtn');
  if (btnCloseDayDetail) {
    btnCloseDayDetail.onclick = () => {
      document.getElementById('dayDetailModal').classList.remove('show');
    };
  }

  // Nút Đồng bộ trên Topbar
  const btnSyncHeader = document.getElementById('btnSyncHeader');
  const syncStatusHeader = document.getElementById('syncStatusHeader');
  if (btnSyncHeader) {
    btnSyncHeader.onclick = async () => {
      btnSyncHeader.disabled = true;
      if (syncStatusHeader) syncStatusHeader.textContent = 'Đang đồng bộ...';
      try {
        if (!currentUser) throw new Error('Đăng nhập trước khi đồng bộ.');
        const res = await syncNow(currentUser.id);
        showToast(`Đã đồng bộ máy chủ! Đẩy: ${res.pushed || 0}, Nhận: ${res.pulled || 0}`);
        route();
      } catch (err) {
        showToast(`Lỗi đồng bộ: ${err.message}`);
      } finally {
        btnSyncHeader.disabled = false;
        if (syncStatusHeader) syncStatusHeader.textContent = 'Đồng bộ';
      }
    };
  }
}

// ==========================================
// 8. TIỆN ÍCH HIỆU ỨNG (MƯA XU, TOAST, PWA)
// ==========================================
export function triggerRainCoinsEffect() {
  const fxLayer = document.getElementById('fxLayer');
  if (!fxLayer) return;
  const items = ['💰', '🪙', '💵', '✨', '💎'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'falling-item';
    el.textContent = items[Math.floor(Math.random() * items.length)];

    const left = Math.random() * 100;
    const duration = 1.2 + Math.random() * 1.5;
    const delay = Math.random() * 0.5;

    el.style.left = `${left}%`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.fontSize = `${1.6 + Math.random() * 0.8}rem`;

    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay) * 1000);
  }
}

export function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW Registration error:', err);
    });
  }
}
