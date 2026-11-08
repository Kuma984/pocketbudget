
export function validateLegitEmail(email) {
  email = (email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Định dạng email không hợp lệ (ví dụ: yourname@gmail.com).' };
  }
  const parts = email.split('@');
  if (parts.length !== 2) return { ok: false, message: 'Địa chỉ email không hợp lệ.' };
  const [user, domain] = parts;

  // Chặn email rác / ảo tạm thời
  const disposable = [
    'tempmail.com', '10minutemail.com', 'mailinator.com', 'guerrillamail.com',
    'trashmail.com', 'yopmail.com', 'dispostable.com', 'sharklasers.com',
    'fakeinbox.com', 'getairmail.com', 'throwawaymail.com', 'burnermail.io'
  ];
  if (disposable.includes(domain)) {
    return { ok: false, message: 'Vui lòng không sử dụng email rác/tạm thời để đăng ký tài khoản.' };
  }

  // Quy tắc kiểm tra tính hợp lệ của tài khoản Gmail (Google standard)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleanUser = user.replace(/\./g, '');
    if (cleanUser.length < 6 || cleanUser.length > 30) {
      return { ok: false, message: 'Tên người dùng Gmail phải có độ dài từ 6 đến 30 ký tự.' };
    }
    if (!/^[a-z0-9.]+$/.test(user)) {
      return { ok: false, message: 'Tên tài khoản Gmail chỉ được chứa chữ cái (a-z), chữ số (0-9) và dấu chấm (không chứa ký tự đặc biệt).' };
    }
    if (user.includes('..') || user.startsWith('.') || user.endsWith('.')) {
      return { ok: false, message: 'Tài khoản Gmail không hợp lệ: Không chứa dấu chấm liên tiếp hoặc ở đầu/cuối.' };
    }
  }

  return { ok: true };
}

import { t } from '../i18n.js';
// System & Backend Sync Module (Thành viên A)
import { apiRequest } from '../api.js';
import { syncNow } from '../sync.js';
import { listRecords, openDatabase } from '../db.js';

export async function render(container) {
  let currentUser = null;
  let csrfToken = null;
  try {
    const res = await apiRequest('auth.php?action=me');
    currentUser = res.user;
    csrfToken = res.csrf_token;
  } catch {
    currentUser = null;
  }

  const userId = currentUser ? currentUser.id : '1';

  // Đếm hàng đợi outbox offline
  let pendingCount = 0;
  try {
    const db = await openDatabase();
    const tx = db.transaction(['outbox'], 'readonly');
    const store = tx.objectStore('outbox');
    const req = store.getAll();
    req.onsuccess = () => {
      pendingCount = (req.result || []).length;
      updateOutboxCount(pendingCount);
    };
  } catch {
    pendingCount = 0;
  }

  container.innerHTML = `
    <section class="card" style="margin-bottom: 20px;">
      <h2><i class="ri-shield-user-line"></i> ${t('sys_auth_title')}</h2>
      <p class="section-desc">${t('sys_auth_desc')}</p>

      ${currentUser ? `
        <div style="background:var(--primary-light); border:1px solid rgba(16,185,129,0.3); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px;">
          <p style="margin:0 0 6px 0;">${t('sys_logged_in_as')} <strong style="color:var(--primary);">${escapeHtml(currentUser.name)}</strong></p>
          <small style="color:var(--muted); display:block; margin-bottom:12px;">Email: ${escapeHtml(currentUser.email)}</small>
          <button type="button" class="btn-secondary" id="btnLogout" style="max-width:180px;"><i class="ri-logout-box-r-line"></i> ${t('sys_btn_logout')}</button>
        </div>
      ` : `
        <div class="grid-2">
          <!-- Form Đăng nhập -->
          <div style="background:var(--bg); border:1px solid var(--line-strong); padding:18px; border-radius:var(--radius-sm);">
            <h3 style="margin-top:0; font-size:1rem;"><i class="ri-login-box-line"></i> ${t('sys_login_title')}</h3>
            <form id="formLogin" class="form">
              <div class="field">
                <label>${t('sys_email_label')}</label>
                <input type="email" id="loginEmail" placeholder="nguyenvana@gmail.com" required>
              </div>
              <div class="field">
                <label>${t('sys_pwd_label')}</label>
                <input type="password" id="loginPassword" placeholder="Nhập mật khẩu..." required>
              </div>
              <button type="submit" class="primary"><i class="ri-login-circle-line"></i> ${t('sys_btn_login')}</button>
            </form>
          </div>

          <!-- Form Đăng ký -->
          <div style="background:var(--bg); border:1px solid var(--line-strong); padding:18px; border-radius:var(--radius-sm);">
            <h3 style="margin-top:0; font-size:1rem;"><i class="ri-user-add-line"></i> ${t('sys_register_title')}</h3>
            <form id="formRegister" class="form">
              <div class="field">
                <label>${t('sys_name_label')}</label>
                <input type="text" id="regName" placeholder="Nguyễn Văn A" required>
              </div>
              <div class="field">
                <label>Email</label>
                <input type="email" id="regEmail" placeholder="nguyenvana@gmail.com" required>
              </div>
              <div class="field">
                <label>${t('sys_pwd_label')}</label>
                <input type="password" id="regPassword" placeholder="Tối thiểu 6 ký tự" required minlength="6">
              </div>
              <button type="submit" class="primary"><i class="ri-check-line"></i> ${t('sys_btn_register')}</button>
            </form>
          </div>
        </div>
      `}
    </section>

    <!-- Trạng thái Hệ thống & Đồng bộ Máy chủ (Đã ẩn theo yêu cầu) -->
    <section class="card" style="display: none; margin-bottom: 20px;">
      <h2><i class="ri-server-line"></i> Kiểm tra Máy chủ Backend & Đồng bộ</h2>
      <p class="section-desc">Kiểm tra kết nối PHP/MySQL Backend, Ollama AI và hàng đợi đồng bộ chống trùng lặp (Idempotency).</p>

      <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px;">
        <button type="button" class="btn-secondary" id="btnCheckHealth" style="flex:1; min-width:200px;">
          <i class="ri-heart-pulse-line"></i> Kiểm tra sức khỏe Backend
        </button>
        <button type="button" class="primary" id="btnSyncNow" style="flex:1; min-width:200px;">
          <i class="ri-refresh-line"></i> Đồng bộ đám mây ngay
        </button>
      </div>

      <div id="healthResult" style="font-size:0.9rem; margin-bottom:14px; min-height:24px;"></div>

      <div style="background:var(--bg); padding:14px; border-radius:var(--radius-sm); border:1px solid var(--line-strong);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>Hàng đợi Outbox chờ đồng bộ:</span>
          <span class="muted-tag" id="outboxCountBadge">Đang đọc...</span>
        </div>
      </div>
    </section>
  `;

  function updateOutboxCount(count) {
    const badge = container.querySelector('#outboxCountBadge');
    if (badge) {
      badge.textContent = `${count} thao tác chưa đẩy`;
      badge.style.color = count > 0 ? 'var(--warn)' : 'var(--primary)';
    }
  }

  // ${t('sys_btn_logout')}
  const btnLogout = container.querySelector('#btnLogout');
  if (btnLogout) {
    btnLogout.onclick = async () => {
      try {
        await apiRequest('auth.php?action=logout', {
          method: 'POST',
          csrfToken: csrfToken,
          body: { csrf_token: csrfToken }
        });
      } catch (err) {
        console.warn('Lưu ý khi đăng xuất:', err);
      } finally {
        localStorage.removeItem('student_name');
        localStorage.removeItem('pocketbudget_cached_user');
        try { sessionStorage.clear(); } catch {}
        location.hash = '#dashboard';
        location.reload();
      }
    };
  }

  // Đăng nhập
  const formLogin = container.querySelector('#formLogin');
  if (formLogin) {
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const email = container.querySelector('#loginEmail').value.trim();
      const password = container.querySelector('#loginPassword').value;
      try {
        const res = await apiRequest('auth.php?action=login', {
          method: 'POST',
          body: { email, password }
        });
        localStorage.setItem('student_name', res.user.name);
        localStorage.setItem('pocketbudget_cached_user', JSON.stringify(res.user));
        alert(`Chào mừng ${res.user.name}! Đăng nhập thành công.`);
        location.reload();
      } catch (err) {
        alert('Đăng nhập thất bại: ' + err.message);
      }
    };
  }

  // Đăng ký
  const formRegister = container.querySelector('#formRegister');
  if (formRegister) {
    const regEmailInput = container.querySelector('#regEmail');
    const emailHint = document.createElement('small');
    emailHint.style.display = 'block';
    emailHint.style.marginTop = '4px';
    emailHint.style.fontSize = '0.8rem';
    regEmailInput.parentNode.appendChild(emailHint);

    regEmailInput.oninput = () => {
      const val = regEmailInput.value.trim();
      if (!val) {
        emailHint.textContent = '';
        return;
      }
      const res = validateLegitEmail(val);
      if (!res.ok) {
        emailHint.style.color = '#ef4444';
        emailHint.textContent = '⚠️ ' + res.message;
      } else {
        emailHint.style.color = '#10b981';
        emailHint.textContent = '✓ Tài khoản email hợp lệ và sẵn sàng đăng ký.';
      }
    };

    formRegister.onsubmit = async (e) => {
      e.preventDefault();
      const name = container.querySelector('#regName').value.trim();
      const email = container.querySelector('#regEmail').value.trim();
      const password = container.querySelector('#regPassword').value;

      const check = validateLegitEmail(email);
      if (!check.ok) {
        alert('⚠️ ' + check.message);
        container.querySelector('#regEmail').focus();
        return;
      }

      if (password.length < 6) {
        alert('⚠️ Mật khẩu phải có độ dài ít nhất 6 ký tự.');
        container.querySelector('#regPassword').focus();
        return;
      }
      try {
        const res = await apiRequest('auth.php?action=register', {
          method: 'POST',
          body: { name, email, password }
        });
        localStorage.setItem('student_name', res.user.name);
        localStorage.setItem('pocketbudget_cached_user', JSON.stringify(res.user));
        alert(`Đăng ký thành công tài khoản ${res.user.name}!`);
        location.reload();
      } catch (err) {
        alert('Đăng ký thất bại: ' + err.message);
      }
    };
  }

  // Health check
  const btnCheckHealth = container.querySelector('#btnCheckHealth');
  const healthResult = container.querySelector('#healthResult');
  if (btnCheckHealth) {
    btnCheckHealth.onclick = async () => {
    btnCheckHealth.disabled = true;
    healthResult.innerHTML = '<span style="color:var(--muted);"><i class="ri-loader-4-line"></i> Đang kiểm tra...</span>';
    try {
      const res = await apiRequest('health.php');
      healthResult.innerHTML = `
        <span style="color:var(--primary); font-weight:700;"><i class="ri-checkbox-circle-fill"></i> Backend: ${res.status}</span> • 
        Database: <strong>${res.database_connected ? 'Đã kết nối (MySQL)' : 'Chưa kết nối'}</strong> • 
        Ollama AI: <strong>${res.ollama_connected ? 'Khả dụng' : 'Chưa bật'}</strong>
      `;
    } catch (err) {
      healthResult.innerHTML = `<span style="color:var(--danger); font-weight:700;"><i class="ri-error-warning-fill"></i> Lỗi kết nối server: ${err.message}</span>`;
    } finally {
      btnCheckHealth.disabled = false;
    }
  };
  }

  // Đồng bộ
  const btnSyncNow = container.querySelector('#btnSyncNow');
  if (btnSyncNow) {
    btnSyncNow.onclick = async () => {
    btnSyncNow.disabled = true;
    btnSyncNow.innerHTML = '<i class="ri-loader-4-line"></i> Đang đồng bộ...';
    try {
      const res = await syncNow(userId, csrfToken);
      alert(`Đồng bộ hoàn tất!\n- Đã gửi lên máy chủ: ${res.pushed || 0} mục\n- Đã kéo về: ${res.pulled || 0} mục`);
      location.hash = '#dashboard';
    } catch (err) {
      alert('Lỗi đồng bộ: ' + err.message);
    } finally {
      btnSyncNow.disabled = false;
      btnSyncNow.innerHTML = '<i class="ri-refresh-line"></i> Đồng bộ đám mây ngay';
    }
  };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
