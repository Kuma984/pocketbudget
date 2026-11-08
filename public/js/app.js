// App.js - Điểm điều phối ứng dụng PocketBudget (Cute Cat Meme Edition)
// Tích hợp toàn diện Thành viên A (Core & Backend), Thành viên B (PWA & Dashboard), Thành viên C (Simulation & AI)
import { render as dashboard } from './modules/dashboard.js';
import { render as transactions } from './modules/transactions.js';
import { render as budget } from './modules/budget.js';
import { render as simulation } from './modules/simulation.js';
import { render as wishlist } from './modules/wishlist.js';
import { render as chat } from './modules/chat.js';
import { render as system } from './modules/system.js';

import { apiRequest } from './api.js';
import { listRecords, saveAndQueue, generateClientUuid } from './db.js';
import { syncNow } from './sync.js';

let currentImageData = null;
let catTimer = null;
let currentUser = null;
let csrfToken = null;

const routes = { dashboard, transactions, budget, simulation, wishlist, chat, system };

// ==========================================
// 1. KHỞI CHẠY KHI TẢI TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  createFallingCoinsAndWallets();
  await fetchCurrentUser();

  // Ẩn Splash Screen sau 1.8s
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        checkOnboarding();
      }, 600);
    } else {
      checkOnboarding();
    }
  }, 1800);

  updateTopBarInfo();
  setupEventListeners();
  setupCameraAndOCR();
  setupJellyButtonSparks();
  registerServiceWorker();
  route();
});

// Lấy thông tin user phiên làm việc nếu có
async function fetchCurrentUser() {
  try {
    const res = await apiRequest('auth.php?action=me');
    currentUser = res.user;
    csrfToken = res.csrf_token;
  } catch {
    currentUser = null;
    csrfToken = null;
  }
}

// ==========================================
// 2. HIỆU ỨNG TƯƠNG TÁC (SPARKS, JELLY, SPLASH)
// ==========================================
function createFallingCoinsAndWallets() {
  const container = document.getElementById('fallingContainer');
  if (!container) return;
  const items = ['💰', '🪙', '💵', '👛', '💳', '✨', '🐱', '💸'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'falling-item';
    el.textContent = items[Math.floor(Math.random() * items.length)];

    const left = Math.random() * 100;
    const duration = 1.8 + Math.random() * 2.5;
    const delay = Math.random() * 1.5;
    const size = 1.6 + Math.random() * 1.2;

    el.style.left = `${left}%`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.fontSize = `${size}rem`;

    container.appendChild(el);
  }
}

function setupJellyButtonSparks() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.jelly-btn, button, .wallet-chip, .cats label');
    if (btn) {
      spawnCoinSparksAtPoint(e.clientX, e.clientY, 5);
    }
  });
}

function spawnCoinSparksAtPoint(x, y, count = 6) {
  if (!x || !y) return;
  const coins = ['🪙', '💰', '✨', '💸'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'particle-coin';
    el.textContent = coins[Math.floor(Math.random() * coins.length)];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }
}

export function triggerExpenseFlyEffect() {
  const heroCard = document.getElementById('heroCard');
  if (heroCard) {
    heroCard.classList.add('shake-effect');
    setTimeout(() => heroCard.classList.remove('shake-effect'), 600);

    const rect = heroCard.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const items = ['💸', '😿', '😭', '💸', '💸'];
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'particle-coin';
      el.textContent = items[Math.floor(Math.random() * items.length)];
      el.style.left = `${centerX}px`;
      el.style.top = `${centerY}px`;

      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 90;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 35;

      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--dy', `${dy}px`);

      document.body.appendChild(el);
      setTimeout(() => el.remove(), 850);
    }
  }
}

export function triggerRainCoinsEffect() {
  const fxLayer = document.getElementById('fxLayer');
  if (!fxLayer) return;
  const items = ['💰', '🪙', '💵', '✨', '💎'];
  for (let i = 0; i < 35; i++) {
    const el = document.createElement('div');
    el.className = 'falling-item';
    el.textContent = items[Math.floor(Math.random() * items.length)];

    const left = Math.random() * 100;
    const duration = 1.2 + Math.random() * 1.8;
    const delay = Math.random() * 0.7;
    const size = 1.5 + Math.random() * 1.4;

    el.style.left = `${left}%`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.fontSize = `${size}rem`;

    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay) * 1000);
  }
}

// ==========================================
// 3. ONBOARDING & TOPBAR
// ==========================================
function checkOnboarding() {
  const localName = localStorage.getItem('student_name');
  const modal = document.getElementById('onboardModal');

  if (currentUser && currentUser.name) {
    if (!localName) localStorage.setItem('student_name', currentUser.name);
    if (modal) modal.style.display = 'none';
    document.getElementById('userHeaderName').textContent = `Chào ${currentUser.name} 👋`;
    return;
  }

  if (!localName || localName.trim() === '') {
    if (modal) modal.style.display = 'flex';
  } else {
    if (modal) modal.style.display = 'none';
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
  const streak = localStorage.getItem('pb_streak_count') || '1';
  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = streak;

  const userId = currentUser ? currentUser.id : '1';
  try {
    const txs = await listRecords('transactions', userId);
    const todayStr = new Date().toISOString().split('T')[0];
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
// 4. ĐIỀU HƯỚNG (ROUTER)
// ==========================================
function route() {
  const raw = location.hash.slice(1) || 'dashboard';
  const name = Object.hasOwn(routes, raw) ? raw : 'dashboard';

  const container = document.getElementById('content');
  if (container) {
    container.innerHTML = '';
    routes[name](container);
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

function updateNetworkStatus() {
  const netEl = document.getElementById('network');
  if (!netEl) return;
  if (navigator.onLine) {
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
// 5. POPUP CON MÈO NHÀO RA KHI XÀI LỐ
// ==========================================
export function triggerCatAlertPopup() {
  const popup = document.getElementById('catAlertOverlay');
  if (!popup) return;
  popup.classList.add('show');

  const card = document.getElementById('catAlertCard');
  if (card) {
    card.classList.add('shake-cat');
    setTimeout(() => card.classList.remove('shake-cat'), 700);
  }

  const moneyBurst = document.getElementById('catMoneyBurst');
  if (moneyBurst) {
    moneyBurst.innerHTML = '';
    const items = ['💸', '💸', '💸', '💸', '💸'];
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'particle-coin';
      el.textContent = items[i % items.length];
      el.style.left = '50%';
      el.style.top = '50%';

      const angle = (i / 12) * Math.PI * 2;
      const distance = 70 + Math.random() * 50;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--dy', `${dy}px`);

      moneyBurst.appendChild(el);
    }
  }

  if (catTimer) clearTimeout(catTimer);
  catTimer = setTimeout(() => {
    closeCatAlert();
  }, 5000);
}

export function closeCatAlert() {
  const popup = document.getElementById('catAlertOverlay');
  if (popup) popup.classList.remove('show');
  if (catTimer) clearTimeout(catTimer);
}

// ==========================================
// 6. MODAL ĐẶT NGÂN SÁCH THÁNG
// ==========================================
function openBudgetModal() {
  const current = Number(localStorage.getItem('user_monthly_budget')) || 3000000;
  const input = document.getElementById('monthlyBudgetInput');
  if (input) input.value = current;
  const modal = document.getElementById('budgetModal');
  if (modal) modal.classList.add('show');
}

function closeBudgetModal() {
  const modal = document.getElementById('budgetModal');
  if (modal) modal.classList.remove('show');
}

function saveMonthlyBudget() {
  const input = document.getElementById('monthlyBudgetInput');
  const val = Number(input.value);
  if (val && val > 0) {
    localStorage.setItem('user_monthly_budget', val);
    closeBudgetModal();
    showToast('Đã cập nhật ngân sách tháng thành công!');
    route();
  } else {
    alert('Vui lòng nhập số tiền ngân sách hợp lệ (> 0 VNĐ)');
  }
}

// ==========================================
// 7. CAMERA NỔI & AI OCR QUÉT HÓA ĐƠN
// ==========================================
async function populateWalletDropdown() {
  const select = document.getElementById('photoWallet');
  if (!select) return;
  select.innerHTML = '';

  const userId = currentUser ? currentUser.id : '1';
  let wallets = await listRecords('wallets', userId);

  if (wallets.length === 0) {
    wallets = [
      { id: 'wallet_cash', name: '💵 Tiền mặt' },
      { id: 'wallet_bank', name: '🏦 Ngân hàng' },
      { id: 'wallet_momo', name: '💖 MoMo' }
    ];
  }

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
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnChooseImage = document.getElementById('btnChooseImage');
  const imageCameraInput = document.getElementById('imageCameraInput');
  const imageGalleryInput = document.getElementById('imageGalleryInput');
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
    if (imageCameraInput) imageCameraInput.value = '';
    if (imageGalleryInput) imageGalleryInput.value = '';
  }

  if (closeCamBtn) closeCamBtn.onclick = closeCameraModal;
  if (btnCancelCam) btnCancelCam.onclick = closeCameraModal;

  function handleImageFile(file) {
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
  }

  // Nếu là máy tính để bàn / laptop (không phải điện thoại di động),
  // bỏ thuộc tính capture="environment" để Chrome/Edge trên PC không bị chặn hộp thoại chọn file/ảnh
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobileDevice && imageCameraInput) {
    imageCameraInput.removeAttribute('capture');
  }

  if (imageCameraInput) {
    imageCameraInput.onchange = (e) => handleImageFile(e.target.files[0]);
  }

  if (imageGalleryInput) {
    imageGalleryInput.onchange = (e) => handleImageFile(e.target.files[0]);
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

      const dateStr = customDate || new Date().toISOString().split('T')[0];
      const isoDate = new Date(dateStr + 'T12:00:00').toISOString();

      const userId = currentUser ? currentUser.id : '1';

      const catMap = {
        'Ăn uống': 'food',
        'Học tập': 'study',
        'Xe cộ': 'transport',
        'Nhà ở': 'housing',
        'Giải trí': 'entertainment',
        'Thu nhập': 'salary'
      };
      const categoryCode = catMap[categoryName] || 'food';

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

      await saveAndQueue({
        user_id: String(userId),
        entity: 'transaction',
        action: 'upsert',
        record: txRecord
      });

      closeCameraModal();
      showToast('Đã lưu khoảnh khắc & chi tiêu!');

      if (type === 'income') {
        triggerRainCoinsEffect();
      } else {
        triggerExpenseFlyEffect();
        if (amount >= 100000) {
          triggerCatAlertPopup();
        }
      }

      route();
    };
  }
}

// ==========================================
// 8. SETUP EVENT LISTENERS
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
  if (btnOpenBudget) btnOpenBudget.onclick = openBudgetModal;

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

  const btnSyncHeader = document.getElementById('btnSyncHeader');
  const syncStatusHeader = document.getElementById('syncStatusHeader');
  if (btnSyncHeader) {
    btnSyncHeader.onclick = async () => {
      btnSyncHeader.disabled = true;
      if (syncStatusHeader) syncStatusHeader.textContent = 'Đang đồng bộ...';
      try {
        const userId = currentUser ? currentUser.id : '1';
        const res = await syncNow(userId, csrfToken);
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
