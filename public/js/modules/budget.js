// Ghép nối Module Ngân Sách (Thành viên B — B02) với IndexedDB & Đồng bộ
import { listRecords, saveAndQueue, generateClientUuid } from '../db.js';
import { formatVND } from '../domain/finance.js';
import { getAppSession, GUEST_USER_ID } from './c-context.js';

export async function render(container) {
  const userId = (await getAppSession())?.user.id ?? GUEST_USER_ID;
  if (!container.isConnected) return;

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  container.innerHTML = `
    <div class="budget-screen">
      <section class="card" style="margin-bottom:20px;">
        <h2><i class="ri-money-dollar-circle-line"></i> Cài đặt & Quản lý Ngân sách Tháng (B02)</h2>
        <p class="section-desc">Thiết lập hạn mức chi tiêu để kiểm soát tài chính sinh viên thông minh và nhận cảnh báo khi bội chi.</p>

        <div style="background:var(--bg); border:1px solid var(--line-strong); padding:18px; border-radius:var(--radius-sm);">
          <h3 style="margin-top:0; font-size:1rem;">Hạn mức tháng hiện tại (${currentMonthKey})</h3>
          
          <form id="form-set-budget" style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
            <div class="field" style="flex:2; min-width:220px;">
              <label>Hạn mức tối đa (VNĐ):</label>
              <input type="number" id="budget-limit-input" min="100000" step="50000" placeholder="Ví dụ: 3000000" required>
            </div>
            <button type="submit" class="primary" style="flex:1; min-width:160px; height:46px;">
              <i class="ri-save-line"></i> Lưu Ngân Sách
            </button>
          </form>
          <div id="budget-msg" style="margin-top:10px; font-size:13px;"></div>
        </div>
      </section>

      <section class="card">
        <div class="card-header-row">
          <h2><i class="ri-history-line"></i> Lịch sử ngân sách các tháng</h2>
        </div>
        <div class="table-responsive" style="margin-top:12px;">
          <table class="pb-table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th style="text-align:right;">Hạn mức (VNĐ)</th>
                <th style="text-align:right;">Đã chi (VNĐ)</th>
                <th style="text-align:center;">Tình trạng</th>
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

    const activeBudget = budgets.find(b => b.month === currentMonthKey);
    const limitInput = container.querySelector('#budget-limit-input');
    if (activeBudget) {
      limitInput.value = activeBudget.limit_vnd;
    } else {
      limitInput.value = Number(localStorage.getItem('user_monthly_budget')) || 3000000;
    }

    // Render bảng lịch sử
    const tbody = container.querySelector('#budget-history-body');
    tbody.innerHTML = '';

    const monthsSet = new Set(budgets.map(b => b.month));
    monthsSet.add(currentMonthKey);
    const months = Array.from(monthsSet).sort().reverse();

    months.forEach(m => {
      const bObj = budgets.find(b => b.month === m);
      const limit = bObj ? bObj.limit_vnd : (m === currentMonthKey ? Number(limitInput.value) : 0);

      const spent = transactions
        .filter(t => t.type === 'expense' && (t.occurred_on || t.date || '').startsWith(m))
        .reduce((sum, t) => sum + Number(t.amount_vnd || t.amount || 0), 0);

      const isOver = limit > 0 && spent > limit;
      const statusBadge = isOver
        ? '<span style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">Vượt mức!</span>'
        : '<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600;">Trong tầm kiểm soát</span>';

      tbody.innerHTML += `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px; font-weight:600;">${m}</td>
          <td style="padding:10px; text-align:right;">${formatVND(limit)}</td>
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

    if (!Number.isSafeInteger(limit) || limit <= 0) {
      alert('Vui lòng nhập hạn mức hợp lệ.');
      return;
    }

    try {
      const budgets = await listRecords('budgets', userId);
      const existing = budgets.find(b => b.month === currentMonthKey);

      const budgetRecord = {
        id: existing ? existing.id : generateClientUuid(),
        month: currentMonthKey,
        limit_vnd: limit,
        version: existing ? (existing.version || 1) : 1
      };

      await saveAndQueue({
        user_id: userId,
        entity: 'budget',
        action: 'upsert',
        record: budgetRecord,
        base_version: existing ? (existing.version || 0) : 0
      });

      msg.innerHTML = '<span style="color:#15803d;">Đã lưu ngân sách và đưa vào hàng chờ đồng bộ thành công!</span>';
      await loadBudgetInfo();
      setTimeout(() => { msg.innerHTML = ''; }, 3000);
    } catch (err) {
      msg.innerHTML = `<span style="color:#b91c1c;">Lỗi: ${err.message}</span>`;
    }
  };
}
