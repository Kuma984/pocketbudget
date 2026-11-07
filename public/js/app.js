// Điểm điều phối ứng dụng PWA (Ghép nối Thành viên A + B)
import { render as dashboard } from './modules/dashboard.js';
import { render as transactions } from './modules/transactions.js';
import { render as budget } from './modules/budget.js';
import { render as simulation } from './modules/simulation.js';
import { render as wishlist } from './modules/wishlist.js';
import { render as chat } from './modules/chat.js';
import { apiRequest } from './api.js';
import { listRecords, saveAndQueue, generateClientUuid } from './db.js';

let currentImageData = null;
let catTimer = null;

const routes = { dashboard, transactions, budget, simulation, wishlist, chat };

// 1. Quản lý Điều hướng (Router)
function route() {
  const raw = location.hash.slice(1) || 'dashboard';
  const name = Object.hasOwn(routes, raw) ? raw : 'dashboard';
  
  routes[name](document.querySelector('#content'));
  
  document.querySelectorAll('nav a').forEach(a => {
    if (a.hash === `#${name}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// 2. Theo dõi trạng thái mạng
function networkHint() {
  const netBadge = document.querySelector('#network');
  if (navigator.onLine) {
    netBadge.textContent = 'Mạng: Trực tuyến (Online)';
    netBadge.style.background = '#d4edda';
    netBadge.style.color = '#155724';
  } else {
    netBadge.textContent = 'Mạng: Ngoại tuyến (Offline)';
    netBadge.style.background = '#f8d7da';
    netBadge.style.color = '#721c24';
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('online', networkHint);
window.addEventListener('offline', networkHint);

// Khởi chạy ban đầu
route();
networkHint();

// 3. Đăng ký Service Worker
const swStatus = document.querySelector('#sw-status');
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => {
      swStatus.textContent = 'Service Worker đã kích hoạt. Ứng dụng đã sẵn sàng chạy Offline!';
    })
    .catch(error => {
      swStatus.textContent = `Không đăng ký được Service Worker: ${error.message}`;
    });
} else {
  swStatus.textContent = 'Service Worker cần chạy trên HTTPS hoặc localhost.';
}

// 4. Kiểm tra Backend Health
const healthBtn = document.querySelector('#health-button');
if (healthBtn) {
  healthBtn.addEventListener('click', async () => {
    const status = document.querySelector('#health-status');
    healthBtn.disabled = true;
    status.textContent = 'Đang kiểm tra backend...';
    try {
      const res = await apiRequest('health.php');
      status.innerHTML = `Backend: <strong style="color:green;">${res.status}</strong> (DB: ${res.database_connected ? 'Đã kết nối' : 'Chưa kết nối'})`;
    } catch (err) {
      status.innerHTML = `<span style="color:red;">Lỗi kết nối server: ${err.message}</span>`;
    } finally {
      healthBtn.disabled = false;
    }
  });
}

// 5. Setup Camera Nổi & AI OCR Tesseract Quét Hóa Đơn (Thành viên B)
setupCameraAndOCR();

async function setupCameraAndOCR() {
  const openCamBtn = document.getElementById('openCamBtn');
  const closeCamBtn = document.getElementById('closeCamBtn');
  const btnCancelQuick = document.getElementById('btnCancelQuick');
  const cameraModal = document.getElementById('cameraModal');
  const imageInput = document.getElementById('imageInput');
  const btnChooseImage = document.getElementById('btnChooseImage');
  const quickForm = document.getElementById('quickTxForm');
  const quickWallet = document.getElementById('quickWallet');
  const photoPreview = document.getElementById('photoPreview');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const scanOverlay = document.getElementById('scanOverlay');
  const scanBadge = document.getElementById('scanBadge');

  // Lấy danh sách ví vào dropdown của modal
  async function populateWallets() {
    let currentUser = null;
    try {
      const res = await apiRequest('auth.php?action=me');
      currentUser = res.user;
    } catch { currentUser = null; }
    const userId = currentUser ? currentUser.id : '1';

    const wallets = await listRecords('wallets', userId);
    quickWallet.innerHTML = '';
    if (wallets.length === 0) {
      quickWallet.innerHTML = '<option value="">-- Chưa có ví (Tạo ví trước) --</option>';
    } else {
      wallets.forEach(w => {
        quickWallet.innerHTML += `<option value="${w.id}">${w.name}</option>`;
      });
    }
    return userId;
  }

  openCamBtn.onclick = async () => {
    await populateWallets();
    cameraModal.classList.add('show');
  };

  function closeModal() {
    cameraModal.classList.remove('show');
    quickForm.reset();
    photoPreview.style.display = 'none';
    cameraPlaceholder.style.display = 'block';
    scanBadge.textContent = '';
    currentImageData = null;
  }

  closeCamBtn.onclick = closeModal;
  btnCancelQuick.onclick = closeModal;

  btnChooseImage.onclick = () => {
    imageInput.click();
  };

  // Xử lý chọn ảnh & Quét AI OCR Tesseract
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
      scanBadge.textContent = '(Đang quét Hóa Đơn AI...)';

      if (typeof Tesseract !== 'undefined') {
        Tesseract.recognize(currentImageData, 'eng+vie')
          .then(({ data: { text } }) => {
            scanOverlay.style.display = 'none';
            // Regex tìm số tiền trên hóa đơn (vd: 45.000, 120,000, 35000)
            const numbers = text.match(/\b\d{1,3}(?:[.,]\d{3})*(?:\s*đ|\s*VND)?\b/gi);
            let detected = 0;

            if (numbers) {
              numbers.forEach(n => {
                const clean = parseInt(n.replace(/[^0-9]/g, ''), 10);
                if (clean >= 1000 && clean > detected && clean < 500000000) {
                  detected = clean;
                }
              });
            }

            if (detected > 0) {
              document.getElementById('quickAmount').value = detected;
              scanBadge.textContent = `✨ Nhận diện được: ${detected.toLocaleString('vi-VN')} đ`;
            } else {
              scanBadge.textContent = '(Chưa nhận diện được giá, hãy nhập tay)';
            }
          })
          .catch(() => {
            scanOverlay.style.display = 'none';
            scanBadge.textContent = '(Vui lòng nhập tay số tiền)';
          });
      } else {
        scanOverlay.style.display = 'none';
        scanBadge.textContent = '(Đã tải ảnh lên)';
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit lưu giao dịch nhanh
  quickForm.onsubmit = async (e) => {
    e.preventDefault();
    const userId = await populateWallets();

    const amount = parseInt(document.getElementById('quickAmount').value, 10);
    const note = document.getElementById('quickNote').value.trim();
    const type = quickForm.elements['quickType'].value;
    const category = document.getElementById('quickCategory').value;
    const walletId = quickWallet.value;

    if (!walletId) {
      alert('Vui lòng tạo ít nhất 1 ví trong tab "Thu chi & ví" trước.');
      return;
    }

    const txRecord = {
      id: generateClientUuid(),
      wallet_id: walletId,
      destination_wallet_id: null,
      type,
      amount_vnd: amount,
      category_code: category,
      occurred_on: new Date().toISOString().split('T')[0],
      note,
      image: currentImageData, // Lưu ảnh hóa đơn
      version: 1
    };

    await saveAndQueue({
      user_id: userId,
      entity: 'transaction',
      action: 'upsert',
      record: txRecord
    });

    closeModal();
    showToast('Đã lưu giao dịch vào IndexedDB!');

    // Hiệu ứng tương tác sinh động
    if (type === 'income') {
      triggerRainCoinsEffect();
    } else {
      if (amount >= 200000) {
        triggerCatAlert();
      }
    }

    // Refresh view hiện tại
    route();
  };
}

// 6. Hiệu ứng Mèo Meme & Mưa Xu
function triggerCatAlert() {
  const overlay = document.getElementById('catAlertOverlay');
  overlay.classList.add('show');
  if (catTimer) clearTimeout(catTimer);
  catTimer = setTimeout(() => {
    overlay.classList.remove('show');
  }, 4500);
}

document.getElementById('btnCloseCatAlert').onclick = () => {
  document.getElementById('catAlertOverlay').classList.remove('show');
  if (catTimer) clearTimeout(catTimer);
};

function triggerRainCoinsEffect() {
  const fxLayer = document.getElementById('fxLayer');
  const items = ['💰', '🪙', '💵', '✨', '💎'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'falling-item';
    el.textContent = items[Math.floor(Math.random() * items.length)];

    const left = Math.random() * 100;
    const duration = 1.2 + Math.random() * 1.5;
    const delay = Math.random() * 0.6;

    el.style.left = `${left}%`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.fontSize = `${1.5 + Math.random()}rem`;

    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay) * 1000);
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
