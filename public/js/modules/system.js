// System & Backend Sync Module (Thành viên A)
import { apiRequest } from '../api.js';
import { syncNow } from '../sync.js';
import { clearCSession, getAppSession, GUEST_USER_ID, setCSession } from './c-context.js';
import { listRecords } from '../db.js';

export async function render(container) {
  const session = await getAppSession();
  const currentUser = session?.user;
  const userId = currentUser?.id ?? GUEST_USER_ID;
  const pending = await listRecords('outbox', userId).catch(() => null);
  if (!container.isConnected) return;

  container.innerHTML = `
    <section class="card" style="margin-bottom: 20px;">
      <h2><i class="ri-shield-user-line"></i> Xác thực Tài khoản (Thành viên A — A01)</h2>
      <p class="section-desc">Hệ thống hỗ trợ làm việc Ngoại tuyến (Offline-First) và Đăng nhập để đồng bộ đám mây.</p>

      ${currentUser ? `
        <div style="background:var(--primary-light); border:1px solid rgba(16,185,129,0.3); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px;">
          <p style="margin:0 0 6px 0;">Đang đăng nhập với tư cách: <strong style="color:var(--primary);">${escapeHtml(currentUser.name)}</strong></p>
          <small style="color:var(--muted); display:block; margin-bottom:12px;">Email: ${escapeHtml(currentUser.email)} • Mã sinh viên ID: #${currentUser.id}</small>
          <button type="button" class="btn-secondary" id="btnLogout" style="max-width:180px;"><i class="ri-logout-box-r-line"></i> Đăng xuất</button>
        </div>
      ` : `
        <div class="grid-2">
          <!-- Form Đăng nhập -->
          <div style="background:var(--bg); border:1px solid var(--line-strong); padding:18px; border-radius:var(--radius-sm);">
            <h3 style="margin-top:0; font-size:1rem;"><i class="ri-login-box-line"></i> Đăng nhập</h3>
            <form id="formLogin" class="form">
              <div class="field">
                <label>Email sinh viên</label>
                <input type="email" id="loginEmail" placeholder="demo@pocketbudget.local" required value="demo@pocketbudget.local">
              </div>
              <div class="field">
                <label>Mật khẩu</label>
                <input type="password" id="loginPassword" placeholder="pocketbudget123" required value="pocketbudget123">
              </div>
              <button type="submit" class="primary"><i class="ri-login-circle-line"></i> Đăng nhập ngay</button>
            </form>
          </div>

          <!-- Form Đăng ký -->
          <div style="background:var(--bg); border:1px solid var(--line-strong); padding:18px; border-radius:var(--radius-sm);">
            <h3 style="margin-top:0; font-size:1rem;"><i class="ri-user-add-line"></i> Đăng ký tài khoản mới</h3>
            <form id="formRegister" class="form">
              <div class="field">
                <label>Họ và tên</label>
                <input type="text" id="regName" placeholder="Nguyễn Văn A" required>
              </div>
              <div class="field">
                <label>Email</label>
                <input type="email" id="regEmail" placeholder="student@tdtu.edu.vn" required>
              </div>
              <div class="field">
                <label>Mật khẩu</label>
                <input type="password" id="regPassword" placeholder="Tối thiểu 6 ký tự" required minlength="6">
              </div>
              <button type="submit" class="primary"><i class="ri-check-line"></i> Đăng ký</button>
            </form>
          </div>
        </div>
      `}
    </section>

    <!-- Trạng thái Hệ thống & Đồng bộ Máy chủ -->
    <section class="card" style="margin-bottom: 20px;">
      <h2><i class="ri-server-line"></i> Kiểm tra Máy chủ Backend & Đồng bộ (A02, A04)</h2>
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

  if (pending) updateOutboxCount(pending.length);
  else container.querySelector('#outboxCountBadge').textContent = 'Không đọc được';

  // Đăng xuất
  const btnLogout = container.querySelector('#btnLogout');
  if (btnLogout) {
    btnLogout.onclick = async () => {
      try {
        await apiRequest('auth.php?action=logout', { method: 'POST', csrfToken: (await getAppSession())?.csrf_token });
        clearCSession();
        localStorage.removeItem('student_name');
        location.reload();
      } catch (err) {
        alert('Lỗi đăng xuất: ' + err.message);
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
        setCSession(res);
        localStorage.setItem('student_name', res.user.name);
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
    formRegister.onsubmit = async (e) => {
      e.preventDefault();
      const name = container.querySelector('#regName').value.trim();
      const email = container.querySelector('#regEmail').value.trim();
      const password = container.querySelector('#regPassword').value;
      try {
        const res = await apiRequest('auth.php?action=register', {
          method: 'POST',
          body: { name, email, password }
        });
        setCSession(res);
        localStorage.setItem('student_name', res.user.name);
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

  // Đồng bộ
  const btnSyncNow = container.querySelector('#btnSyncNow');
  btnSyncNow.onclick = async () => {
    btnSyncNow.disabled = true;
    btnSyncNow.innerHTML = '<i class="ri-loader-4-line"></i> Đang đồng bộ...';
    try {
      if (!currentUser) throw new Error('Đăng nhập trước khi đồng bộ.');
      const res = await syncNow(userId);
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
