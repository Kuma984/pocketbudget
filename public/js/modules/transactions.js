// Thành viên A — Task A03: Màn hình Thu chi & Ví (Viết đơn giản theo chuẩn kiến thức đã học)
import { CATEGORIES } from '../config.js';
import { listRecords, saveAndQueue, generateClientUuid } from '../db.js';
import { calculateWalletBalances, calculateTotalBalance, formatVND } from '../domain/finance.js';
import { apiRequest } from '../api.js';

let currentUser = null;
let editingId = null;

export async function render(container) {
  // Giao diện HTML viết bằng chuỗi template quen thuộc, dễ nhìn
  container.innerHTML = `
    <h2>Quản lý Thu chi & Ví (Thành viên A)</h2>

    <!-- Khung tài khoản -->
    <div id="auth-box" style="background:#e8f4ec; padding:15px; border-radius:8px; margin-bottom:15px;">
      Đang kiểm tra tài khoản...
    </div>

    <!-- Khung tổng quan số dư -->
    <div style="background:#fff; border:1px solid #ccc; padding:15px; border-radius:8px; margin-bottom:15px;">
      <h3>Tổng tài sản: <span id="total-balance" style="color:#175c47; font-size:22px;">0 đ</span></h3>
      <p style="color:#666; font-size:13px;">* Lưu ý: Chuyển tiền giữa 2 ví không làm thay đổi tổng tài sản.</p>
      
      <!-- Danh sách các ví -->
      <div id="wallet-list" style="display:flex; gap:10px; flex-wrap:wrap; margin:10px 0;"></div>
      
      <!-- Form thêm ví -->
      <div style="margin-top:10px;">
        <input type="text" id="new-wallet-name" placeholder="Tên ví (Ví dụ: Tiền mặt, Ngân hàng)" style="padding:6px;">
        <input type="number" id="new-wallet-balance" placeholder="Số dư ban đầu" value="0" style="padding:6px;">
        <button type="button" id="btn-create-wallet">Thêm ví</button>
      </div>
    </div>

    <!-- Form nhập giao dịch -->
    <div style="background:#fff; border:1px solid #ccc; padding:15px; border-radius:8px; margin-bottom:15px;">
      <h3 id="form-title">Thêm giao dịch mới</h3>
      <form id="tx-form">
        <input type="hidden" id="tx-id">

        <label>Loại giao dịch:</label>
        <select id="tx-type" style="padding:6px; margin-right:10px;">
          <option value="expense">Chi tiêu (-)</option>
          <option value="income">Thu nhập (+)</option>
          <option value="transfer">Chuyển ví (⇄)</option>
        </select>

        <label>Ví thực hiện:</label>
        <select id="tx-wallet" style="padding:6px; margin-right:10px;"></select>

        <span id="box-dest-wallet" style="display:none;">
          <label>Ví nhận tiền:</label>
          <select id="tx-dest-wallet" style="padding:6px; margin-right:10px;"></select>
        </span>

        <span id="box-category">
          <label>Danh mục:</label>
          <select id="tx-category" style="padding:6px; margin-right:10px;"></select>
        </span>

        <label>Số tiền (VNĐ):</label>
        <input type="number" id="tx-amount" placeholder="Số tiền" required min="1000" step="1000" style="padding:6px; margin-right:10px;">

        <label>Ngày:</label>
        <input type="date" id="tx-date" required style="padding:6px; margin-right:10px;">

        <div style="margin-top:10px;">
          <input type="text" id="tx-note" placeholder="Ghi chú (Ví dụ: Ăn trưa, nhận học bổng...)" style="width:50%; padding:6px;">
          <button type="submit" id="btn-save-tx">Lưu giao dịch</button>
          <button type="button" id="btn-cancel-edit" style="display:none; background:#888;">Hủy sửa</button>
        </div>
      </form>
    </div>

    <!-- Bảng Sổ giao dịch (Ledger) -->
    <div style="background:#fff; border:1px solid #ccc; padding:15px; border-radius:8px;">
      <h3>Sổ giao dịch (Ledger)</h3>
      <table border="1" style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:8px;">Ngày</th>
            <th style="padding:8px;">Loại</th>
            <th style="padding:8px;">Ví / Danh mục</th>
            <th style="padding:8px;">Ghi chú</th>
            <th style="padding:8px; text-align:right;">Số tiền</th>
            <th style="padding:8px; text-align:center;">Trạng thái</th>
            <th style="padding:8px; text-align:center;">Thao tác</th>
          </tr>
        </thead>
        <tbody id="tx-table-body"></tbody>
      </table>
    </div>
  `;

  // Thiết lập ngày mặc định là hôm nay (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tx-date').value = today;

  // Lấy các phần tử DOM
  const authBox = document.getElementById('auth-box');
  const typeSelect = document.getElementById('tx-type');
  const walletSelect = document.getElementById('tx-wallet');
  const destWalletSelect = document.getElementById('tx-dest-wallet');
  const catSelect = document.getElementById('tx-category');
  const boxDestWallet = document.getElementById('box-dest-wallet');
  const boxCategory = document.getElementById('box-category');
  const form = document.getElementById('tx-form');
  const btnCancel = document.getElementById('btn-cancel-edit');

  // Kiểm tra tài khoản
  await checkAuth();

  // Tải dữ liệu ví và giao dịch
  await loadData();

  // Sự kiện khi thay đổi loại giao dịch (Thu, Chi, Chuyển ví)
  typeSelect.onchange = () => {
    updateCategorySelect();
  };

  function updateCategorySelect() {
    const type = typeSelect.value;
    if (type === 'transfer') {
      boxDestWallet.style.display = 'inline';
      boxCategory.style.display = 'none';
    } else {
      boxDestWallet.style.display = 'none';
      boxCategory.style.display = 'inline';
      const cats = CATEGORIES[type] || [];
      catSelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  }
  updateCategorySelect();

  // Sự kiện tạo ví mới
  document.getElementById('btn-create-wallet').onclick = async () => {
    const nameInput = document.getElementById('new-wallet-name');
    const balanceInput = document.getElementById('new-wallet-balance');
    const name = nameInput.value.trim();
    const balance = parseInt(balanceInput.value, 10) || 0;

    if (!name) {
      alert('Vui lòng nhập tên ví!');
      return;
    }

    const userId = currentUser ? currentUser.id : '1';
    const newWallet = {
      id: generateClientUuid(),
      name,
      opening_balance_vnd: balance,
      version: 1
    };

    await saveAndQueue({
      user_id: userId,
      entity: 'wallet',
      action: 'upsert',
      record: newWallet
    });

    nameInput.value = '';
    balanceInput.value = '0';
    await loadData();
  };

  // Sự kiện gửi Form giao dịch (Thêm mới hoặc Cập nhật)
  form.onsubmit = async (e) => {
    e.preventDefault();

    const userId = currentUser ? currentUser.id : '1';
    const type = typeSelect.value;
    const walletId = walletSelect.value;
    const destWalletId = (type === 'transfer') ? destWalletSelect.value : null;
    const category = (type === 'transfer') ? null : catSelect.value;
    const amount = parseInt(document.getElementById('tx-amount').value, 10);
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('tx-note').value.trim();

    if (!walletId) {
      alert('Vui lòng chọn ví!');
      return;
    }

    if (type === 'transfer' && (!destWalletId || destWalletId === walletId)) {
      alert('Ví nhận tiền phải khác ví gửi!');
      return;
    }

    const txRecord = {
      id: editingId ? editingId : generateClientUuid(),
      wallet_id: walletId,
      destination_wallet_id: destWalletId,
      type,
      amount_vnd: amount,
      category_code: category,
      occurred_on: date,
      note,
      version: 1
    };

    await saveAndQueue({
      user_id: userId,
      entity: 'transaction',
      action: 'upsert',
      record: txRecord
    });

    // Reset form
    form.reset();
    document.getElementById('tx-date').value = today;
    editingId = null;
    document.getElementById('form-title').textContent = 'Thêm giao dịch mới';
    btnCancel.style.display = 'none';
    updateCategorySelect();

    await loadData();
  };

  btnCancel.onclick = () => {
    editingId = null;
    form.reset();
    document.getElementById('tx-date').value = today;
    document.getElementById('form-title').textContent = 'Thêm giao dịch mới';
    btnCancel.style.display = 'none';
    updateCategorySelect();
  };

  // Hàm tải dữ liệu ví và giao dịch từ IndexedDB
  async function loadData() {
    const userId = currentUser ? currentUser.id : '1';
    const wallets = await listRecords('wallets', userId);
    const transactions = await listRecords('transactions', userId);

    // 1. Tính toán số dư
    const balances = calculateWalletBalances(wallets, transactions);
    const total = calculateTotalBalance(wallets, transactions);
    document.getElementById('total-balance').textContent = formatVND(total);

    // 2. Hiển thị thẻ ví
    const walletList = document.getElementById('wallet-list');
    walletList.innerHTML = '';
    walletSelect.innerHTML = '';
    destWalletSelect.innerHTML = '<option value="">-- Chọn ví nhận --</option>';

    wallets.forEach(w => {
      const bal = balances.get(w.id) ?? w.opening_balance_vnd;
      walletList.innerHTML += `
        <div style="border:1px solid #175c47; background:#f4faf6; padding:8px 12px; border-radius:6px;">
          <strong>${w.name}</strong>: ${formatVND(bal)}
        </div>
      `;
      walletSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
      destWalletSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
    });

    // 3. Hiển thị bảng giao dịch
    const tbody = document.getElementById('tx-table-body');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:10px;">Chưa có giao dịch nào.</td></tr>';
      return;
    }

    const walletMap = new Map(wallets.map(w => [w.id, w.name]));

    // Sắp xếp ngày mới nhất lên đầu
    transactions.sort((a, b) => (b.occurred_on || '').localeCompare(a.occurred_on || ''));

    transactions.forEach(tx => {
      const wName = walletMap.get(tx.wallet_id) || 'Ví';
      let typeLabel = '';
      let detail = '';
      let amountColor = '#000';
      let sign = '';

      if (tx.type === 'income') {
        typeLabel = '<span style="color:green; font-weight:bold;">Thu</span>';
        detail = `${wName} · ${tx.category_code || ''}`;
        amountColor = 'green';
        sign = '+';
      } else if (tx.type === 'expense') {
        typeLabel = '<span style="color:red; font-weight:bold;">Chi</span>';
        detail = `${wName} · ${tx.category_code || ''}`;
        amountColor = 'red';
        sign = '-';
      } else if (tx.type === 'transfer') {
        typeLabel = '<span style="color:blue; font-weight:bold;">Chuyển</span>';
        const dName = walletMap.get(tx.destination_wallet_id) || 'Ví đích';
        detail = `${wName} ➔ ${dName}`;
        amountColor = '#333';
        sign = '⇄';
      }

      const syncBadge = (tx.sync_status === 'pending')
        ? '<span style="background:#fff3cd; color:#856404; padding:2px 6px; border-radius:4px; font-size:12px;">Chờ sync</span>'
        : '<span style="background:#d4edda; color:#155724; padding:2px 6px; border-radius:4px; font-size:12px;">Đã sync</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px;">${tx.occurred_on}</td>
        <td style="padding:8px;">${typeLabel}</td>
        <td style="padding:8px;">${detail}</td>
        <td style="padding:8px;">${tx.note || ''}</td>
        <td style="padding:8px; text-align:right; font-weight:bold; color:${amountColor};">${sign} ${formatVND(tx.amount_vnd)}</td>
        <td style="padding:8px; text-align:center;">${syncBadge}</td>
        <td style="padding:8px; text-align:center;">
          <button type="button" class="btn-edit" style="padding:3px 8px; font-size:12px;">Sửa</button>
          <button type="button" class="btn-del" style="background:#d9534f; padding:3px 8px; font-size:12px;">Xóa</button>
        </td>
      `;

      // Nút Sửa
      tr.querySelector('.btn-edit').onclick = () => {
        editingId = tx.id;
        document.getElementById('form-title').textContent = 'Chỉnh sửa giao dịch';
        btnCancel.style.display = 'inline';
        typeSelect.value = tx.type;
        updateCategorySelect();
        walletSelect.value = tx.wallet_id;
        if (tx.type === 'transfer') destWalletSelect.value = tx.destination_wallet_id || '';
        else catSelect.value = tx.category_code || '';
        document.getElementById('tx-amount').value = tx.amount_vnd;
        document.getElementById('tx-date').value = tx.occurred_on;
        document.getElementById('tx-note').value = tx.note || '';
        form.scrollIntoView({ behavior: 'smooth' });
      };

      // Nút Xóa
      tr.querySelector('.btn-del').onclick = async () => {
        if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
        await saveAndQueue({
          user_id: userId,
          entity: 'transaction',
          action: 'delete',
          record: tx
        });
        await loadData();
      };

      tbody.appendChild(tr);
    });
  }

  // Hàm kiểm tra và vẽ trạng thái đăng nhập
  async function checkAuth() {
    try {
      const res = await apiRequest('auth.php?action=me');
      currentUser = res.user;
    } catch {
      currentUser = null;
    }

    if (currentUser) {
      authBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            Xin chào: <strong>${currentUser.name}</strong> (${currentUser.email}) - [ID: ${currentUser.id}]
          </div>
          <button type="button" id="btn-logout" style="background:#c9302c; padding:6px 12px; font-size:12px;">Đăng xuất</button>
        </div>
      `;
      document.getElementById('btn-logout').onclick = async () => {
        await apiRequest('auth.php?action=logout', { method: 'POST' });
        currentUser = null;
        await checkAuth();
        await loadData();
      };
    } else {
      authBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>Bạn chưa đăng nhập server. Dữ liệu đang được lưu offline trên máy.</div>
          <div>
            <button type="button" id="btn-login-demo" style="padding:6px 12px; font-size:12px;">Đăng nhập Demo</button>
          </div>
        </div>
      `;
      document.getElementById('btn-login-demo').onclick = async () => {
        try {
          const res = await apiRequest('auth.php?action=login', {
            method: 'POST',
            body: { email: 'demo@pocketbudget.local', password: 'pocketbudget123' }
          });
          currentUser = res.user;
          await checkAuth();
          await loadData();
        } catch (err) {
          alert('Chưa thể đăng nhập demo: ' + err.message);
        }
      };
    }
  }
}
