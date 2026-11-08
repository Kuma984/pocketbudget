// Thành viên A — Task A03: Màn hình Thu chi & Ví (Giao diện chuẩn Netlify Cute Theme)
import { CATEGORIES } from '../config.js';
import { listRecords, saveAndQueue, generateClientUuid } from '../db.js';
import { calculateWalletBalances, calculateTotalBalance, formatVND } from '../domain/finance.js';
import { getAppSession, GUEST_USER_ID } from './c-context.js';
import { todayLocal } from './c-tools.js';

export async function render(container) {
  let currentUser = null;
  let editingId = null;
  container.innerHTML = `
    <!-- Khung tài khoản & trạng thái -->
    <div id="auth-box" style="margin-bottom: 16px;"></div>

    <!-- Khung tổng quan số dư các ví -->
    <section class="card" style="margin-bottom: 20px;">
      <div class="card-header-row">
        <h2><i class="ri-wallet-3-line"></i> Quản lý các Ví & Tổng tài sản</h2>
        <span class="muted-tag" style="background:var(--primary-light); color:var(--primary); font-weight:700;">Định luật bảo toàn tài sản</span>
      </div>
      
      <div style="margin: 12px 0 16px;">
        <span style="font-size:0.85rem; color:var(--muted);">Tổng tài sản ròng:</span>
        <div id="total-balance" style="font-size: 2.2rem; font-weight: 800; color: var(--primary);">0 đ</div>
        <small style="color:var(--muted); font-size:0.8rem;">* Thao tác Chuyển tiền giữa 2 ví không làm thay đổi tổng tài sản.</small>
      </div>

      <!-- Danh sách các ví -->
      <div id="wallet-list" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;"></div>

      <!-- Form thêm ví mới -->
      <div style="background:var(--bg); border:1px solid var(--line-strong); padding:14px; border-radius:var(--radius-sm);">
        <h4 style="margin:0 0 10px 0; font-size:0.92rem;"><i class="ri-add-line"></i> Tạo thêm ví mới</h4>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input type="text" id="new-wallet-name" placeholder="Tên ví (vd: Tiền mặt, Techcombank, MoMo)" style="flex:2; min-width:180px;">
          <input type="number" id="new-wallet-balance" placeholder="Số dư ban đầu" value="0" style="flex:1; min-width:130px;">
          <button type="button" id="btn-create-wallet" class="primary" style="flex:1; min-width:120px; padding:10px;">
            <i class="ri-add-circle-line"></i> Thêm ví
          </button>
        </div>
      </div>
    </section>

    <!-- Form nhập / sửa giao dịch -->
    <section class="card" style="margin-bottom: 20px;">
      <h2 id="form-title"><i class="ri-add-box-line"></i> Thêm giao dịch / Chuyển ví</h2>
      <form id="tx-form" class="form" style="margin-top:12px;">
        <input type="hidden" id="tx-id">

        <div class="grid-2">
          <div class="field">
            <label>Loại giao dịch</label>
            <select id="tx-type" class="select-field">
              <option value="expense">Khoản chi (-)</option>
              <option value="income">Khoản thu (+)</option>
              <option value="transfer">Chuyển ví (⇄)</option>
            </select>
          </div>

          <div class="field">
            <label>Ví thực hiện</label>
            <select id="tx-wallet" class="select-field"></select>
          </div>
        </div>

        <div class="grid-2">
          <div class="field" id="box-dest-wallet" style="display:none;">
            <label>Ví nhận tiền</label>
            <select id="tx-dest-wallet" class="select-field"></select>
          </div>

          <div class="field" id="box-category">
            <label>Danh mục</label>
            <select id="tx-category" class="select-field"></select>
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label>Số tiền (VNĐ)</label>
            <input type="number" id="tx-amount" placeholder="Nhập số tiền" required min="1" step="1">
          </div>

          <div class="field">
            <label>Ngày phát sinh</label>
            <input type="date" id="tx-date" required>
          </div>
        </div>

        <div class="field">
          <label>Ghi chú / Mô tả giao dịch</label>
          <input type="text" id="tx-note" placeholder="Ví dụ: Ăn trưa bún bò, nhận trợ cấp gia đình..." required>
        </div>

        <div style="display:flex; gap:10px; margin-top:8px;">
          <button type="button" id="btn-cancel-edit" class="btn-secondary" style="display:none; flex:1;">Hủy sửa</button>
          <button type="submit" id="btn-save-tx" class="primary" style="flex:2;"><i class="ri-check-line"></i> Lưu Giao Dịch</button>
        </div>
      </form>
    </section>

    <!-- Bảng Sổ giao dịch (Ledger) -->
    <section class="card">
      <div class="card-header-row">
        <h2><i class="ri-book-read-line"></i> Sổ cái giao dịch (Ledger)</h2>
        <span class="muted-tag" id="ledgerCountTag">0 bản ghi</span>
      </div>
      <div class="table-responsive" style="margin-top:12px;">
        <table class="pb-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Loại</th>
              <th>Ví / Danh mục</th>
              <th>Ghi chú</th>
              <th style="text-align:right;">Số tiền</th>
              <th style="text-align:center;">Trạng thái</th>
              <th style="text-align:center;">Thao tác</th>
            </tr>
          </thead>
          <tbody id="tx-table-body">
            <tr><td colspan="7" style="text-align:center; color:var(--muted); padding:20px;">Đang tải dữ liệu...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // Thiết lập ngày mặc định
  const today = todayLocal();
  container.querySelector('#' + 'tx-date').value = today;

  const authBox = container.querySelector('#' + 'auth-box');
  const typeSelect = container.querySelector('#' + 'tx-type');
  const walletSelect = container.querySelector('#' + 'tx-wallet');
  const destWalletSelect = container.querySelector('#' + 'tx-dest-wallet');
  const catSelect = container.querySelector('#' + 'tx-category');
  const boxDestWallet = container.querySelector('#' + 'box-dest-wallet');
  const boxCategory = container.querySelector('#' + 'box-category');
  const form = container.querySelector('#' + 'tx-form');
  const btnCancel = container.querySelector('#' + 'btn-cancel-edit');

  await checkAuth();
  await loadData();

  typeSelect.onchange = () => {
    updateCategorySelect();
  };

  async function checkAuth() {
    const session = await getAppSession();
    currentUser = session?.user ?? null;
    if (currentUser) {
      authBox.innerHTML = `
        <div style="background:var(--primary-light); border:1px solid rgba(16,185,129,0.3); padding:12px 16px; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
          <span>Đang đăng nhập: <strong>${escapeHtml(currentUser.name)}</strong> (${escapeHtml(currentUser.email)})</span>
          <span class="status-pill" data-state="online"><i class="ri-cloud-line"></i> Đã kết nối Auth</span>
        </div>
      `;
    } else {
      authBox.innerHTML = `
        <div style="background:var(--bg); border:1px solid var(--line-strong); padding:12px 16px; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
          <span>Chế độ: <strong>Ngoại tuyến (Offline-First)</strong></span>
          <a href="#system" class="status-pill-btn" style="text-decoration:none;"><i class="ri-login-box-line"></i> Đăng nhập</a>
        </div>
      `;
    }
  }

  function getUserId() {
    return currentUser?.id ?? GUEST_USER_ID;
  }

  async function loadData() {
    const userId = getUserId();
    const wallets = await listRecords('wallets', userId);
    let transactions = await listRecords('transactions', userId);


    // Chuẩn hóa dữ liệu tương thích
    transactions = transactions.map(t => ({
      ...t,
      amount_vnd: Number(t.amount_vnd != null ? t.amount_vnd : (t.amount || 0)),
      occurred_on: t.occurred_on || (t.date ? t.date.split('T')[0] : today),
      note: t.note || t.title || 'Giao dịch',
      type: t.type || 'expense'
    }));

    // Tính toán số dư các ví
    const balances = calculateWalletBalances(wallets, transactions);
    const total = calculateTotalBalance(wallets, transactions);

    container.querySelector('#' + 'total-balance').textContent = formatVND(total);

    // Render danh sách ví
    const walletList = container.querySelector('#' + 'wallet-list');
    walletList.innerHTML = '';
    wallets.forEach(w => {
      const b = balances.get(w.id) || 0;
      const chip = document.createElement('div');
      chip.className = 'card';
      chip.style.padding = '12px 18px';
      chip.style.flex = '1';
      chip.style.minWidth = '140px';
      chip.innerHTML = `
        <div style="font-size:0.82rem; color:var(--muted);">${escapeHtml(w.name)}</div>
        <div style="font-size:1.15rem; font-weight:800; color:var(--text); margin-top:2px;">${formatVND(b)}</div>
      `;
      walletList.appendChild(chip);
    });

    // Điền dữ liệu vào dropdown ví
    walletSelect.innerHTML = '';
    destWalletSelect.innerHTML = '';
    wallets.forEach(w => {
      walletSelect.innerHTML += `<option value="${w.id}">${escapeHtml(w.name)}</option>`;
      destWalletSelect.innerHTML += `<option value="${w.id}">${escapeHtml(w.name)}</option>`;
    });

    updateCategorySelect();
    renderTransactionsTable(transactions, wallets);
  }

  function updateCategorySelect() {
    const type = typeSelect.value;
    catSelect.innerHTML = '';

    if (type === 'transfer') {
      boxDestWallet.style.display = 'block';
      boxCategory.style.display = 'none';
    } else {
      boxDestWallet.style.display = 'none';
      boxCategory.style.display = 'block';

      const cats = type === 'expense' ? CATEGORIES.expense : CATEGORIES.income;
      cats.forEach(c => {
        catSelect.innerHTML += `<option value="${c.code}">${c.name}</option>`;
      });
    }
  }

  function renderTransactionsTable(transactions, wallets) {
    const tbody = container.querySelector('#' + 'tx-table-body');
    tbody.innerHTML = '';

    const countTag = container.querySelector('#' + 'ledgerCountTag');
    if (countTag) countTag.textContent = `${transactions.length} bản ghi`;

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:20px;">Chưa có giao dịch nào!</td></tr>';
      return;
    }

    const sorted = [...transactions].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

    sorted.forEach(t => {
      const tr = document.createElement('tr');
      const wName = wallets.find(w => w.id === t.wallet_id)?.name || 'Ví tiền mặt';
      const destWName = t.destination_wallet_id ? (wallets.find(w => w.id === t.destination_wallet_id)?.name || 'Ví đích') : '';

      let typeBadge = '';
      let amtColor = '';
      let sign = '-';

      if (t.type === 'expense') {
        typeBadge = '<span class="chip neg" style="padding:3px 10px; font-size:0.75rem;">Chi tiêu</span>';
        amtColor = 'var(--danger)';
        sign = '-';
      } else if (t.type === 'income') {
        typeBadge = '<span class="chip pos" style="padding:3px 10px; font-size:0.75rem;">Thu nhập</span>';
        amtColor = 'var(--primary)';
        sign = '+';
      } else {
        typeBadge = '<span class="muted-tag" style="background:#e0f2fe; color:#0284c7; padding:3px 10px; font-size:0.75rem;">Chuyển ví</span>';
        amtColor = '#0284c7';
        sign = '⇄ ';
      }

      const syncStatus = (t.version && t.version > 0)
        ? '<span style="color:var(--primary); font-size:0.8rem;"><i class="ri-check-double-line"></i> Đã đồng bộ</span>'
        : '<span style="color:var(--warn); font-size:0.8rem;"><i class="ri-time-line"></i> Chờ đẩy</span>';

      tr.innerHTML = `
        <td>${t.occurred_on}</td>
        <td>${typeBadge}</td>
        <td>${t.type === 'transfer' ? `${escapeHtml(wName)} ➔ ${escapeHtml(destWName)}` : escapeHtml(wName)}</td>
        <td>${escapeHtml(t.note)}</td>
        <td style="text-align:right; font-weight:700; color:${amtColor};">${sign}${formatVND(t.amount_vnd)}</td>
        <td style="text-align:center;">${syncStatus}</td>
        <td style="text-align:center;">
          <button class="btn-edit" data-id="${t.id}" style="background:none; border:none; color:var(--primary); cursor:pointer; padding:4px;" title="Sửa"><i class="ri-edit-line"></i></button>
          <button class="btn-delete" data-id="${t.id}" style="background:none; border:none; color:var(--danger); cursor:pointer; padding:4px;" title="Xóa"><i class="ri-delete-bin-line"></i></button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.onclick = () => onEdit(btn.getAttribute('data-id'), sorted);
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick = () => onDelete(btn.getAttribute('data-id'));
    });
  }

  // Thêm ví mới
  container.querySelector('#' + 'btn-create-wallet').onclick = async () => {
    const nameInput = container.querySelector('#' + 'new-wallet-name');
    const balanceInput = container.querySelector('#' + 'new-wallet-balance');
    const name = nameInput.value.trim();
    const balance = parseInt(balanceInput.value, 10) || 0;

    if (!name) {
      alert('Vui lòng nhập tên ví.');
      return;
    }

    const userId = getUserId();
    const newWallet = {
      id: generateClientUuid(),
      user_id: String(userId),
      name: name,
      opening_balance_vnd: balance,
      created_at: new Date().toISOString()
    };

    await saveAndQueue({
      user_id: String(userId),
      entity: 'wallet',
      action: 'upsert',
      record: newWallet
    });

    nameInput.value = '';
    balanceInput.value = '0';
    await loadData();
  };

  // Submit Form Lưu Giao Dịch
  form.onsubmit = async (e) => {
    e.preventDefault();
    const userId = getUserId();

    const type = typeSelect.value;
    const walletId = walletSelect.value;
    const destWalletId = (type === 'transfer') ? destWalletSelect.value : null;
    const catCode = (type === 'transfer') ? null : catSelect.value;
    const amount = parseInt(container.querySelector('#' + 'tx-amount').value, 10);
    const date = container.querySelector('#' + 'tx-date').value;
    const note = container.querySelector('#' + 'tx-note').value.trim();

    if (!walletId) return alert('Thêm hoặc đồng bộ ví trước khi lưu giao dịch.');
    if (!Number.isSafeInteger(amount) || amount <= 0) return alert('Số tiền phải là số nguyên dương.');
    if (type === 'transfer' && walletId === destWalletId) {
      alert('Ví nhận tiền phải khác ví chuyển.');
      return;
    }

    const txId = editingId ? editingId : generateClientUuid();
    const txRecord = {
      id: txId,
      user_id: String(userId),
      wallet_id: walletId,
      destination_wallet_id: destWalletId,
      type: type,
      amount_vnd: amount,
      amount: amount,
      category_code: catCode,
      occurred_on: date,
      date: new Date(date + 'T12:00:00').toISOString(),
      note: note,
      title: note,
      version: 1,
      updated_at: new Date().toISOString()
    };

    await saveAndQueue({
      user_id: String(userId),
      entity: 'transaction',
      action: 'upsert',
      record: txRecord
    });

    resetForm();
    await loadData();
  };

  function onEdit(id, transactions) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;

    editingId = id;
    container.querySelector('#' + 'form-title').innerHTML = `<i class="ri-edit-line"></i> Sửa giao dịch (#${id.slice(0, 8)})`;
    typeSelect.value = t.type;
    updateCategorySelect();

    walletSelect.value = t.wallet_id;
    if (t.type === 'transfer' && t.destination_wallet_id) {
      destWalletSelect.value = t.destination_wallet_id;
    }
    if (t.category_code) {
      catSelect.value = t.category_code;
    }

    container.querySelector('#' + 'tx-amount').value = t.amount_vnd;
    container.querySelector('#' + 'tx-date').value = t.occurred_on;
    container.querySelector('#' + 'tx-note').value = t.note;

    btnCancel.style.display = 'inline-block';
  }

  async function onDelete(id) {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này không?')) return;
    const userId = getUserId();
    await saveAndQueue({
      user_id: String(userId),
      entity: 'transaction',
      action: 'delete',
      record: { id }
    });
    await loadData();
  }

  function resetForm() {
    editingId = null;
    container.querySelector('#' + 'form-title').innerHTML = '<i class="ri-add-box-line"></i> Thêm giao dịch / Chuyển ví';
    form.reset();
    container.querySelector('#' + 'tx-date').value = today;
    typeSelect.value = 'expense';
    updateCategorySelect();
    btnCancel.style.display = 'none';
  }

  btnCancel.onclick = resetForm;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
