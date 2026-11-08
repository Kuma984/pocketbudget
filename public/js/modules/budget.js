import { t } from '../i18n.js';
// Ghép nối Module Ngân Sách (Thành viên B — B02) với IndexedDB & Đồng bộ
import { listRecords, saveAndQueue, generateClientUuid } from '../db.js';
import { formatVND, getMonthBudgetStatus, isValidAmount } from '../domain/finance.js';
import { apiRequest } from '../api.js';

/** Tháng hiện tại theo ngày địa phương, dạng YYYY-MM. */
export function currentMonthKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Cùng cách xác định user với Tổng quan/Thu chi: phiên máy chủ, nếu không gọi được thì user đã lưu trên máy. */
export async function resolveLocalUserId() {
  try {
    const res = await apiRequest('auth.php?action=me');
    if (res.user) {
      localStorage.setItem('pocketbudget_cached_user', JSON.stringify(res.user));
      return String(res.user.id);
    }
  } catch { /* Dùng user đã lưu bên dưới. */ }
  try {
    const cached = JSON.parse(localStorage.getItem('pocketbudget_cached_user'));
    if (cached?.id) return String(cached.id);
  } catch { /* Không có user đã lưu. */ }
  return '1';
}

/**
 * Đường ghi hạn mức duy nhất: tab Ngân sách và nút "Đặt Ngân Sách" đều gọi hàm này.
 * Ghi vào IndexedDB + outbox trong một transaction, nên Tổng quan và Mô phỏng thấy ngay trên máy.
 */
export async function saveMonthBudget(userId, month, limit) {
  if (!isValidAmount(limit)) throw new Error('Hạn mức phải là số nguyên dương.');
  const budgets = await listRecords('budgets', userId);
  const status = getMonthBudgetStatus(budgets, [], month);
  const existing = status.budget_id ? budgets.find(b => b.id === status.budget_id) : null;
  const record = {
    id: existing ? existing.id : generateClientUuid(),
    month,
    limit_vnd: limit,
    updated_at: new Date().toISOString(),
  };
  return saveAndQueue({
    user_id: userId, entity: 'budget', action: 'upsert', record,
    base_version: existing ? (existing.version || 0) : 0,
  });
}

/** Hạn mức đang lưu của tháng (null nếu chưa đặt), đọc từ cùng nguồn với Tổng quan và Mô phỏng. */
export async function readMonthBudgetLimit(userId, month) {
  const budgets = await listRecords('budgets', userId);
  return getMonthBudgetStatus(budgets, [], month).limit_vnd;
}

export async function render(container) {
  const userId = await resolveLocalUserId();
  const monthKey = currentMonthKey();

  container.innerHTML = `
    <div class="budget-screen">
      <section class="card" style="margin-bottom:20px;">
        <h2><i class="ri-money-dollar-circle-line"></i> ${t('budget_mgmt_title')}</h2>
        <p class="section-desc">${t('budget_mgmt_desc')}</p>

        <div style="background:var(--bg); border:1px solid var(--line-strong); padding:18px; border-radius:var(--radius-sm);">
          <h3 style="margin-top:0; font-size:1rem;">${t('current_month_limit', { month: monthKey })}</h3>
          
          <form id="form-set-budget" style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
            <div class="field" style="flex:2; min-width:220px;">
              <label>${t('max_limit_label')}</label>
              <input type="number" id="budget-limit-input" min="100000" step="50000" placeholder="${t('limit_placeholder')}" required>
            </div>
            <button type="submit" class="primary" style="flex:1; min-width:160px; height:46px;">
              <i class="ri-save-line"></i> ${t('btn_save_budget')}
            </button>
          </form>
          <div id="budget-msg" style="margin-top:10px; font-size:13px;"></div>
          <p id="budget-status" style="margin:10px 0 0; font-size:0.88rem;"></p>
        </div>
      </section>

      <section class="card">
        <div class="card-header-row">
          <h2><i class="ri-history-line"></i> ${t('budget_history_title')}</h2>
        </div>
        <div class="table-responsive" style="margin-top:12px;">
          <table class="pb-table">
            <thead>
              <tr>
                <th>${t('th_month')}</th>
                <th style="text-align:right;">${t('th_limit')}</th>
                <th style="text-align:right;">${t('th_spent')}</th>
                <th style="text-align:center;">${t('th_status')}</th>
              </tr>
            </thead>
            <tbody id="budget-history-body"></tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  await loadBudgetInfo();

  async function loadBudgetInfo() {
    const budgets = await listRecords('budgets', userId);
    const transactions = await listRecords('transactions', userId);

    const limitInput = container.querySelector('#budget-limit-input');
    const statusEl = container.querySelector('#budget-status');
    let current;
    try {
      current = getMonthBudgetStatus(budgets, transactions, monthKey);
    } catch {
      statusEl.innerHTML = '<span style="color:#b91c1c;">Có giao dịch hoặc hạn mức không hợp lệ trong sổ trên máy.</span>';
      return;
    }
    // Chỉ điền hạn mức đã lưu; chưa đặt thì để trống thay vì tự điền số mặc định.
    if (document.activeElement !== limitInput) limitInput.value = current.limit_vnd ?? '';
    if (current.state === 'unset') {
      statusEl.textContent = `Chưa đặt hạn mức tháng ${monthKey}. Đã chi ${formatVND(current.spent_vnd)}.`;
    } else {
      const label = current.state === 'over' ? t('over_budget_label') : current.state === 'zero' ? t('zero_budget_label') : t('remaining_budget_label');
      statusEl.innerHTML = `${label}: <b style="color:${current.state === 'ok' ? '#15803d' : '#b91c1c'};">${formatVND(current.remaining_vnd)}</b>`
        + t('formula_desc', { limit: formatVND(current.limit_vnd), spent: formatVND(current.spent_vnd) });
    }

    // Render bảng lịch sử
    const tbody = container.querySelector('#budget-history-body');
    tbody.innerHTML = '';

    const monthsSet = new Set(budgets.map(b => b.month));
    monthsSet.add(monthKey);
    const months = Array.from(monthsSet).sort().reverse();

    months.forEach(m => {
      let row;
      try { row = getMonthBudgetStatus(budgets, transactions, m); } catch { return; }
      const limit = row.limit_vnd ?? 0;
      const spent = row.spent_vnd;

      const ratio = limit > 0 ? (spent / limit) : 0;
      const percent = Math.round(ratio * 100);

      let statusBadge = '';
      if (row.state === 'unset') {
        statusBadge = `<span style="background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">Chưa đặt hạn mức</span>`;
      } else if (ratio > 1) {
        statusBadge = `<span style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">Vượt mức (${percent}%)</span>`;
      } else if (ratio >= 0.8) {
        statusBadge = `<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">Cảnh báo (${percent}%)</span>`;
      } else {
        statusBadge = `<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">Trong tầm kiểm soát (${percent}%)</span>`;
      }
      const isOver = ratio > 1;

      tbody.innerHTML += `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px; font-weight:600;">${m}</td>
          <td style="padding:10px; text-align:right;">${row.limit_vnd === null ? '—' : formatVND(limit)}</td>
          <td style="padding:10px; text-align:right; font-weight:bold; color:${isOver ? '#b91c1c' : '#15803d'};">${formatVND(spent)}</td>
          <td style="padding:10px; text-align:center;">${statusBadge}</td>
        </tr>
      `;
    });
  }

  const form = container.querySelector('#form-set-budget');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const limit = parseInt(container.querySelector('#budget-limit-input').value, 10);
    const msg = container.querySelector('#budget-msg');

    if (!limit || limit <= 0) {
      alert('Vui lòng nhập hạn mức hợp lệ.');
      return;
    }

    try {
      await saveMonthBudget(userId, monthKey, limit);
      msg.innerHTML = '<span style="color:#15803d;">Đã lưu hạn mức trên máy và đưa vào hàng chờ đồng bộ.</span>';
      await loadBudgetInfo();
      setTimeout(() => { msg.innerHTML = ''; }, 3000);
    } catch (err) {
      msg.innerHTML = `<span style="color:#b91c1c;">Lỗi: ${err.message}</span>`;
    }
  };
}
