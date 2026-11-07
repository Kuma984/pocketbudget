// Ghép nối Module Dashboard (Thành viên B — B02, B06) với Dữ liệu IndexedDB & Đồng bộ
import { listRecords } from '../db.js';
import { calculateWalletBalances, calculateTotalBalance, formatVND } from '../domain/finance.js';
import { syncNow } from '../sync.js';
import { apiRequest } from '../api.js';

let activeWalletFilter = 'all';
let currentViewYear = new Date().getFullYear();
let currentViewMonth = new Date().getMonth(); // 0 - 11

export async function render(container) {
  // Lấy user hiện tại nếu có
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

  container.innerHTML = `
    <div class="dashboard-screen">
      <!-- Thanh công cụ & Nút Đồng bộ -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        <div>
          <h2 style="margin:0;">Tổng quan Tài chính & Khoảnh khắc</h2>
          <span style="font-size:13px; color:#555;">
            ${currentUser ? `Tài khoản: <strong>${currentUser.name}</strong> (${currentUser.email})` : 'Chế độ ngoại tuyến (Offline)'}
          </span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" id="btn-sync-server" class="jelly-btn" style="background:#175c47; color:#fff; padding:8px 14px; border-radius:8px; font-size:13px; cursor:pointer;">
            <i class="ri-refresh-line"></i> Đồng bộ máy chủ
          </button>
          <span id="sync-status-text" style="font-size:12px; color:#555;"></span>
        </div>
      </div>

      <!-- Thẻ Ngân Sách & Số Dư (Hero Card) -->
      <section class="hero" id="heroCard" style="margin-bottom: 20px;">
        <div class="hero-header">
          <p class="hero-label">Ngân sách tháng này</p>
          <span class="badge-remaining">Còn lại: <b id="totalRemaining">0đ</b></span>
        </div>
        
        <div class="hero-amount-row">
          <div class="hero-amount" id="totalBalance">0 đ</div>
        </div>

        <!-- Thanh Ngân Sách Đã Dùng % -->
        <div class="budget-progress-box">
          <div class="budget-progress-info">
            <span>Đã dùng: <b id="budgetPercentText">0%</b> ngân sách</span>
            <span id="budgetUsedAmountText">0đ</span>
          </div>
          <div class="budget-progress-track">
            <div class="budget-progress-bar" id="budgetProgressBar" style="width: 0%;"></div>
          </div>
        </div>

        <p class="hero-sub" style="margin-top:10px;">Mỗi ngày được tiêu: <span id="dailyBudget" style="font-weight:700; color:var(--primary, #175c47);">0đ</span></p>

        <div class="hero-chips" style="display:flex; gap:12px; margin-top:12px;">
          <span class="chip pos" style="background:#d4edda; color:#155724; padding:6px 12px; border-radius:20px; font-size:13px;">
            <i class="ri-arrow-down-line"></i> Thu: <b id="totalIncome">0đ</b>
          </span>
          <span class="chip neg" style="background:#f8d7da; color:#721c24; padding:6px 12px; border-radius:20px; font-size:13px;">
            <i class="ri-arrow-up-line"></i> Chi: <b id="totalExpenseChip">0đ</b>
          </span>
        </div>
      </section>

      <!-- Thanh lọc Ví -->
      <div class="wallet-bar" id="walletFilterBar" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
        <button class="wallet-chip jelly-btn active" data-wallet="all"><i class="ri-grid-fill"></i> Tất cả ví</button>
      </div>

      <!-- Lịch Khoảnh Khắc Chi Tiêu -->
      <section class="card locket-section-card" style="margin-bottom:20px;">
        <div class="locket-header" style="display:flex; justify-content:space-between; align-items:center;">
          <button class="locket-nav-btn jelly-btn" id="btn-prev-month"><i class="ri-arrow-left-s-line"></i></button>
          <h3 id="locketMonthTitle" style="margin:0;">Tháng</h3>
          <button class="locket-nav-btn jelly-btn" id="btn-next-month"><i class="ri-arrow-right-s-line"></i></button>
        </div>
        <p class="section-desc" style="text-align: center; margin: 4px 0 12px; font-size:13px; color:#666;">
          Lướt xem nhật ký khoảnh khắc & hóa đơn chi tiêu 📸
        </p>
        
        <div class="calendar-grid-header">
          <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
        </div>
        <div class="calendar-grid" id="calendarGrid"></div>
      </section>

      <!-- Biểu Đồ Thống Kê 7 Ngày & Biểu Đồ Tròn -->
      <div class="grid-2" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px; margin-bottom:20px;">
        <section class="card">
          <h3><i class="ri-bar-chart-line"></i> Chi tiêu 7 ngày qua</h3>
          <div class="week" id="weeklyChart" style="display:flex; justify-content:space-between; align-items:flex-end; height:180px; padding-top:20px;"></div>
        </section>

        <section class="card">
          <h3><i class="ri-pie-chart-2-line"></i> Phân tích danh mục</h3>
          <div class="pie-chart-container" style="display:flex; align-items:center; gap:16px;">
            <div class="donut-svg-wrap" style="width:140px; height:140px;">
              <svg viewBox="0 0 36 36" class="donut-chart" id="donutSvg" style="width:100%; height:100%;"></svg>
            </div>
            <div class="pie-legend" id="pieLegend" style="flex:1; font-size:13px;"></div>
          </div>
        </section>
      </div>

      <!-- Danh Sách Lịch Sử Giao Dịch Gần Đây -->
      <section class="card">
        <div class="card-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0;"><i class="ri-history-line"></i> Giao dịch gần đây</h3>
          <small id="txCount" class="muted-tag" style="color:#777; font-size:12px;">0 giao dịch</small>
        </div>
        <ul class="tx-list" id="txList" style="list-style:none; padding:0; margin:0;">
          <p class="empty" style="text-align:center; color:#888;">Đang tải dữ liệu...</p>
        </ul>
      </section>
    </div>
  `;

  // Xử lý nút đồng bộ máy chủ
  const btnSync = container.querySelector('#btn-sync-server');
  const syncStatusText = container.querySelector('#sync-status-text');
  btnSync.onclick = async () => {
    btnSync.disabled = true;
    syncStatusText.textContent = 'Đang đồng bộ...';
    try {
      const res = await syncNow(userId, csrfToken);
      syncStatusText.textContent = `Đã đồng bộ ${res.pushed || 0} mục!`;
      await loadAndRenderDashboard();
    } catch (err) {
      syncStatusText.textContent = `Lỗi đồng bộ: ${err.message}`;
    } finally {
      btnSync.disabled = false;
      setTimeout(() => { syncStatusText.textContent = ''; }, 4000);
    }
  };

  // Điều hướng chuyển tháng trong lịch
  container.querySelector('#btn-prev-month').onclick = () => {
    currentViewMonth--;
    if (currentViewMonth < 0) { currentViewMonth = 11; currentViewYear--; }
    loadAndRenderDashboard();
  };
  container.querySelector('#btn-next-month').onclick = () => {
    currentViewMonth++;
    if (currentViewMonth > 11) { currentViewMonth = 0; currentViewYear++; }
    loadAndRenderDashboard();
  };

  await loadAndRenderDashboard();

  async function loadAndRenderDashboard() {
    // Đọc ví và giao dịch từ IndexedDB
    const wallets = await listRecords('wallets', userId);
    const transactions = await listRecords('transactions', userId);
    const budgets = await listRecords('budgets', userId);

    // Tính toán số dư
    const totalBalance = calculateTotalBalance(wallets, transactions);

    // Lấy ngân sách tháng hiện tại
    const currentMonthKey = `${currentViewYear}-${String(currentViewMonth + 1).padStart(2, '0')}`;
    const budgetObj = budgets.find(b => b.month === currentMonthKey);
    const monthlyBudget = budgetObj ? budgetObj.limit_vnd : (Number(localStorage.getItem('user_monthly_budget')) || 3000000);

    // Lọc theo ví nếu người dùng chọn
    const filteredTxs = activeWalletFilter === 'all'
      ? transactions
      : transactions.filter(t => t.wallet_id === activeWalletFilter || (t.wallet && t.wallet === activeWalletFilter));

    let income = 0;
    let expense = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    filteredTxs.forEach(t => {
      const amt = Number(t.amount_vnd || t.amount || 0);
      if (t.type === 'income') {
        income += amt;
      } else if (t.type === 'expense') {
        expense += amt;
      }
    });

    const remainingBudget = monthlyBudget - expense;

    // Cập nhật số liệu trên Hero Card
    container.querySelector('#totalBalance').textContent = formatVND(totalBalance);
    container.querySelector('#totalRemaining').textContent = formatVND(remainingBudget);
    container.querySelector('#totalIncome').textContent = formatVND(income);
    container.querySelector('#totalExpenseChip').textContent = formatVND(expense);

    // Tính toán % ngân sách đã dùng
    const usedPercent = Math.min(100, Math.max(0, Math.round((expense / monthlyBudget) * 100))) || 0;
    container.querySelector('#budgetPercentText').textContent = `${usedPercent}%`;
    container.querySelector('#budgetUsedAmountText').textContent = `${formatVND(expense)} / ${formatVND(monthlyBudget)}`;
    container.querySelector('#budgetProgressBar').style.width = `${usedPercent}%`;

    // Số ngày còn lại trong tháng
    const now = new Date();
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
    const dailyBudget = Math.max(0, Math.floor(remainingBudget / daysRemaining));
    container.querySelector('#dailyBudget').textContent = `${formatVND(dailyBudget)}/ngày`;

    // Render thanh chọn ví
    renderWalletBar(wallets);

    // Render Lịch khoảnh khắc
    renderCalendarGrid(transactions);

    // Render Biểu đồ 7 ngày
    renderWeeklyChart(transactions);

    // Render Biểu đồ tròn
    renderPieChart(transactions);

    // Render danh sách giao dịch
    renderTransactionList(filteredTxs, wallets);
  }

  function renderWalletBar(wallets) {
    const bar = container.querySelector('#walletFilterBar');
    bar.innerHTML = `<button class="wallet-chip jelly-btn ${activeWalletFilter === 'all' ? 'active' : ''}" data-wallet="all"><i class="ri-grid-fill"></i> Tất cả ví</button>`;
    
    wallets.forEach(w => {
      const btn = document.createElement('button');
      btn.className = `wallet-chip jelly-btn ${activeWalletFilter === w.id ? 'active' : ''}`;
      btn.setAttribute('data-wallet', w.id);
      btn.innerHTML = `<i class="ri-wallet-3-line"></i> ${escapeHtml(w.name)}`;
      bar.appendChild(btn);
    });

    bar.querySelectorAll('.wallet-chip').forEach(btn => {
      btn.onclick = (e) => {
        bar.querySelectorAll('.wallet-chip').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeWalletFilter = e.currentTarget.getAttribute('data-wallet');
        loadAndRenderDashboard();
      };
    });
  }

  function renderCalendarGrid(txs) {
    const titleEl = container.querySelector('#locketMonthTitle');
    titleEl.textContent = `Tháng ${currentViewMonth + 1} / ${currentViewYear}`;

    const grid = container.querySelector('#calendarGrid');
    grid.innerHTML = '';

    const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // T2 -> CN
    const totalDays = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day empty-cell';
      grid.appendChild(emptyCell);
    }

    const todayDate = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentViewYear}-${String(currentViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = todayDate.getFullYear() === currentViewYear && todayDate.getMonth() === currentViewMonth && todayDate.getDate() === d;

      const dayTxs = txs.filter(t => (t.occurred_on || '').startsWith(dateStr) || (t.date && t.date.startsWith(dateStr)));
      const photoTx = dayTxs.find(t => t.image);
      const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_vnd || t.amount || 0), 0);

      const dayEl = document.createElement('div');
      dayEl.className = `cal-day ${isToday ? 'today' : ''}`;

      let imgHTML = photoTx ? `<img src="${photoTx.image}" class="cal-img-thumb" alt="Moment">` : '';
      let badgeHTML = dayTxs.length > 1 ? `<span class="cal-badge">+${dayTxs.length - 1}</span>` : '';
      let expHTML = dayExpense > 0 ? `<span class="cal-amt-indicator">-${formatVND(dayExpense)}</span>` : '';

      dayEl.innerHTML = `
        <span class="day-num">${d}</span>
        ${imgHTML}
        ${expHTML}
        ${badgeHTML}
      `;

      grid.appendChild(dayEl);
    }
  }

  function renderWeeklyChart(txs) {
    const chartEl = container.querySelector('#weeklyChart');
    chartEl.innerHTML = '';

    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayExp = txs.filter(t => {
        const tDate = t.occurred_on || (t.date ? t.date.split('T')[0] : '');
        return t.type === 'expense' && tDate === dateStr;
      }).reduce((sum, t) => sum + Number(t.amount_vnd || t.amount || 0), 0);

      last7Days.push({
        label: i === 0 ? 'Hôm nay' : days[d.getDay()],
        amount: dayExp
      });
    }

    const maxExp = Math.max(...last7Days.map(x => x.amount), 50000);

    chartEl.innerHTML = last7Days.map((item, idx) => {
      const heightPct = Math.max(5, Math.min(100, Math.round((item.amount / maxExp) * 100)));
      return `
        <div class="wk" style="display:flex; flex-direction:column; align-items:center; flex:1;">
          <span class="wk-amt" style="font-size:10px; color:#555; height:16px;">${item.amount > 0 ? formatVND(item.amount) : ''}</span>
          <div class="wk-bar" style="width:24px; height:${heightPct}%; background:#175c47; border-radius:4px 4px 0 0; transition:height 0.4s ease;"></div>
          <span style="font-size:12px; margin-top:4px;">${item.label}</span>
        </div>
      `;
    }).join('');
  }

  function renderPieChart(txs) {
    const svgEl = container.querySelector('#donutSvg');
    const legendEl = container.querySelector('#pieLegend');

    const catTotals = {};
    let totalExp = 0;

    txs.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category_code || t.category || 'other_expense';
      const amt = Number(t.amount_vnd || t.amount || 0);
      catTotals[cat] = (catTotals[cat] || 0) + amt;
      totalExp += amt;
    });

    if (totalExp === 0) {
      svgEl.innerHTML = '<circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" stroke-width="3.8"></circle>';
      legendEl.innerHTML = '<p class="empty" style="color:#888;">Chưa có chi tiêu để phân tích.</p>';
      return;
    }

    const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#64748b'];
    let accumulatedAngle = 0;
    let paths = '';
    let legends = '';

    const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    entries.forEach(([cat, amt], idx) => {
      const percent = (amt / totalExp) * 100;
      const strokeDash = `${percent} ${100 - percent}`;
      const color = colors[idx % colors.length];

      paths += `
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="${color}" stroke-width="3.8"
          stroke-dasharray="${strokeDash}" stroke-dashoffset="${100 - accumulatedAngle}"></circle>
      `;
      accumulatedAngle += percent;

      legends += `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span><span style="display:inline-block; width:10px; height:10px; background:${color}; border-radius:50%; margin-right:6px;"></span>${cat}</span>
          <strong>${Math.round(percent)}%</strong>
        </div>
      `;
    });

    svgEl.innerHTML = paths;
    legendEl.innerHTML = legends;
  }

  function renderTransactionList(txs, wallets) {
    const listEl = container.querySelector('#txList');
    const countEl = container.querySelector('#txCount');
    const walletMap = new Map(wallets.map(w => [w.id, w.name]));

    countEl.textContent = `${txs.length} giao dịch`;

    if (txs.length === 0) {
      listEl.innerHTML = '<p class="empty" style="text-align:center; padding:16px; color:#888;">Chưa có giao dịch nào.</p>';
      return;
    }

    const sorted = [...txs].sort((a, b) => ((b.occurred_on || b.date || '').localeCompare(a.occurred_on || a.date || '')));

    listEl.innerHTML = sorted.slice(0, 10).map(t => {
      const amt = Number(t.amount_vnd || t.amount || 0);
      const isInc = t.type === 'income';
      const isTr = t.type === 'transfer';
      const wName = walletMap.get(t.wallet_id) || t.wallet || 'Ví';
      const date = (t.occurred_on || t.date || '').split('T')[0];

      let icon = isInc ? '💰' : (isTr ? '⇄' : '🍜');
      let color = isInc ? '#10b981' : (isTr ? '#4b5563' : '#ef4444');
      let sign = isInc ? '+' : (isTr ? '⇄' : '-');

      let thumb = t.image ? `<img src="${t.image}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; margin-right:8px;" alt="Receipt">` : '';

      return `
        <li style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f0f0f0;">
          <div style="display:flex; align-items:center;">
            ${thumb}
            <div>
              <div style="font-weight:600; font-size:14px;">${escapeHtml(t.note || t.title || t.category_code || 'Giao dịch')}</div>
              <small style="color:#777;">${date} · ${escapeHtml(wName)}</small>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; color:${color}; font-size:15px;">${sign} ${formatVND(amt)}</div>
            <small style="font-size:11px; color:${t.sync_status === 'pending' ? '#d97706' : '#10b981'};">
              ${t.sync_status === 'pending' ? 'Chờ sync' : 'Đã sync'}
            </small>
          </div>
        </li>
      `;
    }).join('');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
