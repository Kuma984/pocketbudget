// Dashboard Module - Netlify Cute Cat Meme Edition (Thành viên B) tích hợp với Đồng bộ & IndexedDB (Thành viên A)
import { listRecords, saveAndQueue } from '../db.js';
import { calculateWalletBalances, calculateTotalBalance, dailyAllowance, daysLeftInMonth, formatVND, getMonthBudgetStatus, getMonthTotals } from '../domain/finance.js';
import { apiRequest } from '../api.js';

let activeWalletFilter = 'all';
let currentViewYear = new Date().getFullYear();
let currentViewMonth = new Date().getMonth(); // 0-11

export async function render(container) {
  let currentUser = null;
  try {
    const res = await apiRequest('auth.php?action=me');
    currentUser = res.user;
    if (currentUser) localStorage.setItem('pocketbudget_cached_user', JSON.stringify(currentUser));
  } catch {
    const cached = localStorage.getItem('pocketbudget_cached_user');
    if (cached) {
      try { currentUser = JSON.parse(cached); } catch { currentUser = null; }
    } else {
      currentUser = null;
    }
  }
  const userId = currentUser ? currentUser.id : '1';

  container.innerHTML = `
    <!-- THẺ NGÂN SÁCH CHÍNH (SỐ BỰ ĐÙNG VỚI THANH TIẾN ĐỘ) -->
    <section class="hero" id="heroCard">
      <div class="hero-header">
        <p class="hero-label" id="heroBudgetLabel">Ngân sách còn lại trong tháng</p>
        <span class="badge-remaining">Hạn mức: <b id="totalBudgetInitial">—</b></span>
      </div>
      
      <div class="hero-amount-row">
        <div class="hero-amount" id="totalBalance">0 ₫</div>
      </div>
      <p class="hero-sub" id="heroBudgetNote" style="margin-top:2px;">Hạn mức tháng − tổng chi tháng, tính trên tất cả ví.</p>

      <!-- Thanh Ngân Sách Đã Dùng % Màu Vàng -->
      <div class="budget-progress-box">
        <div class="budget-progress-info">
          <span>Đã dùng: <b id="budgetPercentText">0%</b> ngân sách</span>
          <span id="budgetUsedAmountText">0đ</span>
        </div>
        <div class="budget-progress-track">
          <div class="budget-progress-bar" id="budgetProgressBar" style="width: 0%;"></div>
        </div>
      </div>

      <p class="hero-sub">Mỗi ngày được tiêu: <span id="dailyBudget" style="font-weight:700; color:var(--primary);">0đ</span></p>
      <p class="hero-sub"><span id="walletBalanceLabel">Số dư hiện tại (tất cả ví)</span>: <b id="walletBalanceValue">0đ</b></p>
      <div class="hero-chips">
        <span class="chip pos"><i class="ri-arrow-down-line"></i> Thu tháng này: <b id="totalIncome">0đ</b></span>
        <span class="chip neg"><i class="ri-arrow-up-line"></i> Chi tháng này: <b id="totalExpenseChip">0đ</b></span>
      </div>
    </section>

    <!-- Thanh chọn Ví -->
    <div class="wallet-bar" id="walletBar">
      <button class="wallet-chip jelly-btn active" data-wallet="all"><i class="ri-grid-fill"></i> Tất cả ví</button>
    </div>

    <!-- Lịch Nhật Ký Khoảnh Khắc -->
    <section class="card locket-section-card">
      <div class="locket-header">
        <button class="locket-nav-btn jelly-btn" id="locketPrevMonth"><i class="ri-arrow-left-s-line"></i></button>
        <h2 id="locketMonthTitle" style="margin:0;">Tháng</h2>
        <button class="locket-nav-btn jelly-btn" id="locketNextMonth"><i class="ri-arrow-right-s-line"></i></button>
      </div>
      <p class="section-desc" style="text-align: center; margin-top: 4px;">Lướt xem nhật ký khoảnh khắc & chi tiêu các tháng 📸</p>
      
      <div class="calendar-grid-header">
        <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
      </div>
      <div class="calendar-grid" id="calendarGrid"></div>
    </section>

    <!-- Biểu Đồ Thống Kê & Biểu Đồ Tròn Đa Màu Sắc -->
    <div class="grid-2">
      <section class="card">
        <h2><i class="ri-bar-chart-line"></i> Chi tiêu 7 ngày qua</h2>
        <div class="week" id="weeklyChart"></div>
      </section>

      <section class="card">
        <h2><i class="ri-pie-chart-2-line"></i> Phân tích biểu đồ tròn</h2>
        <div class="pie-chart-container">
          <div class="donut-svg-wrap">
            <svg viewBox="0 0 36 36" class="donut-chart" id="donutSvg"></svg>
          </div>
          <div class="pie-legend" id="pieLegend"></div>
        </div>
      </section>
    </div>

    <!-- Danh Sách Lịch Sử Giao Dịch -->
    <section class="card">
      <div class="card-header-row">
        <h2><i class="ri-history-line"></i> Lịch sử giao dịch</h2>
        <small id="txCount" class="muted-tag">0 khoản</small>
      </div>
      <ul class="tx-list" id="txList">
        <p class="empty" style="text-align:center; padding:16px; color:var(--muted);">Đang tải dữ liệu...</p>
      </ul>
    </section>
  `;

  // Xử lý nút chuyển tháng
  container.querySelector('#locketPrevMonth').onclick = () => {
    currentViewMonth--;
    if (currentViewMonth < 0) {
      currentViewMonth = 11;
      currentViewYear--;
    }
    loadAndRenderDashboard();
  };

  container.querySelector('#locketNextMonth').onclick = () => {
    currentViewMonth++;
    if (currentViewMonth > 11) {
      currentViewMonth = 0;
      currentViewYear++;
    }
    loadAndRenderDashboard();
  };

  await loadAndRenderDashboard();

  async function loadAndRenderDashboard() {
    let rawWallets = await listRecords('wallets', userId);
    let rawTxs = await listRecords('transactions', userId);

    // Deduplicate wallets by normalized name
    const seenWalletNames = new Set();
    let wallets = [];
    for (const w of rawWallets) {
      const norm = (w.name || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      if (!seenWalletNames.has(norm) && norm !== '') {
        seenWalletNames.add(norm);
        wallets.push(w);
      }
    }

    if (wallets.length === 0) {
      wallets = [
        { id: 'wallet_cash', user_id: String(userId), name: '💵 Tiền mặt', initial_balance_vnd: 0 },
        { id: 'wallet_bank', user_id: String(userId), name: '🏦 Ngân hàng', initial_balance_vnd: 0 },
        { id: 'wallet_momo', user_id: String(userId), name: '💖 Ví MoMo', initial_balance_vnd: 0 }
      ];
    }

    const allTxs = rawTxs.map(t => {
      const amount = Number(t.amount_vnd != null ? t.amount_vnd : (t.amount || 0));
      const date = t.date || (t.occurred_on ? `${t.occurred_on}T12:00:00` : new Date().toISOString());
      const title = t.title || t.note || 'Giao dịch';
      const category = normalizeCatName(t.category || t.category_code);
      const walletName = t.wallet || (wallets.find(w => w.id === t.wallet_id)?.name) || 'Ví tiền mặt';
      return {
        ...t,
        amount,
        date,
        title,
        category,
        wallet: walletName,
        type: t.type || 'expense'
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const filteredTxs = activeWalletFilter === 'all'
      ? allTxs
      : allTxs.filter(t => t.wallet === activeWalletFilter || t.wallet_id === activeWalletFilter);

    // Ngân sách và số dư dùng hàm chung trong domain/finance.js, cùng nguồn với tab Ngân sách và Mô phỏng.
    const budgets = await listRecords('budgets', userId);
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monthKey = todayKey.slice(0, 7);
    const scopeTxs = activeWalletFilter === 'all'
      ? rawTxs
      : rawTxs.filter(t => t.wallet_id === activeWalletId(wallets) || (t.type === 'transfer' && t.destination_wallet_id === activeWalletId(wallets)));

    let status = null;
    let monthScope = { income_vnd: 0, expense_vnd: 0 };
    let dataError = false;
    try {
      // Ngân sách là hạn mức chung của tài khoản: luôn tính trên tất cả ví.
      status = getMonthBudgetStatus(budgets, rawTxs, monthKey);
      monthScope = getMonthTotals(scopeTxs.filter(t => !(t.type === 'transfer')), monthKey);
    } catch {
      dataError = true;
    }

    const [, mm] = monthKey.split('-');
    container.querySelector('#heroBudgetLabel').textContent = `Ngân sách còn lại tháng ${Number(mm)}/${now.getFullYear()}`;
    const amountEl = container.querySelector('#totalBalance');
    const noteEl = container.querySelector('#heroBudgetNote');
    const remainingDays = daysLeftInMonth(todayKey);

    if (dataError) {
      amountEl.textContent = 'Lỗi dữ liệu';
      noteEl.textContent = 'Có giao dịch hoặc hạn mức không hợp lệ trong sổ trên máy.';
    } else if (status.state === 'unset') {
      amountEl.textContent = 'Chưa đặt hạn mức';
      amountEl.style.fontSize = '1.6rem';
      noteEl.innerHTML = `Đã chi tháng này ${formatVND(status.spent_vnd)}. <a href="#budget">Đặt hạn mức</a> để theo dõi ngân sách còn lại.`;
    } else {
      amountEl.style.fontSize = '';
      animateCountUp(status.remaining_vnd, 'totalBalance');
      noteEl.textContent = status.state === 'over'
        ? `Đã vượt hạn mức ${formatVND(-status.remaining_vnd)}. Tính trên tất cả ví.`
        : status.state === 'zero'
          ? 'Đã dùng hết hạn mức tháng này. Tính trên tất cả ví.'
          : 'Hạn mức tháng − tổng chi tháng, tính trên tất cả ví.';
    }
    const limit = status?.limit_vnd ?? null;
    const spent = status?.spent_vnd ?? 0;
    container.querySelector('#totalBudgetInitial').textContent = limit === null ? 'chưa đặt' : formatVND(limit);
    container.querySelector('#totalIncome').textContent = formatVND(monthScope.income_vnd);
    container.querySelector('#totalExpenseChip').textContent = formatVND(monthScope.expense_vnd);

    // % hạn mức đã dùng (tổng chi tháng / hạn mức). Thu nhập không cộng vào hạn mức.
    const usedPercent = limit ? Math.min(100, Math.max(0, Math.round((spent / limit) * 100))) : 0;
    container.querySelector('#budgetPercentText').textContent = limit ? `${Math.round((spent / limit) * 100)}%` : '—';
    container.querySelector('#budgetUsedAmountText').textContent = limit ? `${formatVND(spent)} / ${formatVND(limit)}` : `${formatVND(spent)} / chưa đặt`;
    container.querySelector('#budgetProgressBar').style.width = `${usedPercent}%`;

    // Số dư thật trong ví: số dư ban đầu + thu − chi; chuyển ví không đổi tổng.
    const walletLabelEl = container.querySelector('#walletBalanceLabel');
    const walletValueEl = container.querySelector('#walletBalanceValue');
    if (activeWalletFilter === 'all') {
      walletLabelEl.textContent = `Số dư hiện tại (tất cả ${wallets.length} ví)`;
      walletValueEl.textContent = formatVND(calculateTotalBalance(wallets, rawTxs));
    } else {
      const id = activeWalletId(wallets);
      const w = wallets.find(row => row.id === id);
      walletLabelEl.textContent = `Số dư hiện tại (${w ? w.name : 'ví đã chọn'})`;
      walletValueEl.textContent = formatVND(calculateWalletBalances(wallets, rawTxs).get(id) ?? 0);
    }

    // Cập nhật trạng thái hôm nay trên topbar
    let todayExp = 0;
    rawTxs.forEach(t => {
      if (!t.deleted_at && t.type === 'expense' && t.occurred_on === todayKey) todayExp += Number(t.amount_vnd) || 0;
    });
    const todayStatusEl = document.getElementById('todayExpenseStatus');
    if (todayStatusEl) {
      if (todayExp > 0) {
        todayStatusEl.textContent = `Đã chi ${formatVND(todayExp)}`;
        todayStatusEl.style.color = 'var(--danger)';
      } else {
        todayStatusEl.textContent = 'Chưa chi tiêu';
        todayStatusEl.style.color = 'var(--primary)';
      }
    }

    // Ngân sách mỗi ngày của tháng hiện tại, làm tròn xuống như Mô phỏng.
    const daily = dailyAllowance(status?.remaining_vnd ?? null, remainingDays);
    container.querySelector('#dailyBudget').textContent = daily === null
      ? `chưa có hạn mức (${remainingDays} ngày còn lại)`
      : `${formatVND(daily)}/ngày (${remainingDays} ngày còn lại)`;

    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    container.querySelector('#locketMonthTitle').textContent = `${monthNames[currentViewMonth]} ${currentViewYear}`;

    renderWalletBar(wallets);
    renderCalendarGrid(filteredTxs);
    renderWeeklyChart(filteredTxs);
    renderPieDonutChart(filteredTxs);
    renderTxList(filteredTxs, userId);
  }

  function activeWalletId(wallets) {
    const w = wallets.find(row => row.id === activeWalletFilter || row.name === activeWalletFilter);
    return w ? w.id : activeWalletFilter;
  }

  function animateCountUp(targetVal, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const startVal = 0;
    const duration = 750;
    const startTime = performance.now();

    function updateCount(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const currentVal = Math.round(startVal + (targetVal - startVal) * easeProgress);

      el.textContent = formatVND(currentVal);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    }

    requestAnimationFrame(updateCount);
  }

  function renderWalletBar(wallets) {
    const bar = container.querySelector('#walletBar');
    bar.innerHTML = `<button class="wallet-chip jelly-btn ${activeWalletFilter === 'all' ? 'active' : ''}" data-wallet="all"><i class="ri-grid-fill"></i> Tất cả ví</button>`;

    const seenBarNames = new Set();
    wallets.forEach(w => {
      const norm = (w.name || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      if (seenBarNames.has(norm)) return;
      seenBarNames.add(norm);

      const btn = document.createElement('button');
      btn.className = `wallet-chip jelly-btn ${activeWalletFilter === w.name || activeWalletFilter === w.id ? 'active' : ''}`;
      btn.setAttribute('data-wallet', w.name);
      
      let icon = 'ri-wallet-3-line';
      if (w.name.toLowerCase().includes('ngân hàng') || w.name.toLowerCase().includes('bank')) icon = 'ri-bank-card-line';
      if (w.name.toLowerCase().includes('momo')) icon = 'ri-star-line';

      btn.innerHTML = `<i class="${icon}"></i> ${escapeHtml(w.name)}`;
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
    const grid = container.querySelector('#calendarGrid');
    grid.innerHTML = '';

    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    const now = new Date();

    const txMap = {};
    txs.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === currentViewMonth && d.getFullYear() === currentViewYear) {
        const day = d.getDate();
        if (!txMap[day]) txMap[day] = [];
        txMap[day].push(t);
      }
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dayTxs = txMap[d] || [];
      const photoTx = dayTxs.find(t => t.image);
      const dayTotalExp = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

      const isToday = (d === now.getDate() && currentViewMonth === now.getMonth() && currentViewYear === now.getFullYear());

      const dayEl = document.createElement('div');
      dayEl.className = `cal-day ${isToday ? 'today' : ''}`;
      dayEl.onclick = () => openDayDetailOrCamera(d, currentViewMonth + 1, currentViewYear, dayTxs);

      let imgHTML = photoTx ? `<img src="${photoTx.image}" class="cal-img-thumb" alt="Moment">` : '';
      let badgeHTML = dayTxs.length > 1 ? `<span class="cal-badge">+${dayTxs.length - 1}</span>` : '';
      let expIndicator = dayTotalExp > 0 ? `<span class="cal-amt-indicator">-${formatVND(dayTotalExp)}</span>` : '';

      dayEl.innerHTML = `
        <span class="day-num">${d}</span>
        ${imgHTML}
        ${expIndicator}
        ${badgeHTML}
      `;
      grid.appendChild(dayEl);
    }
  }

  function openDayDetailOrCamera(day, month, year, dayTxs) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const selectedInput = document.getElementById('selectedDateInput');
    if (selectedInput) selectedInput.value = dateStr;

    if (dayTxs.length > 0) {
      openDayDetailModal(day, dayTxs, month, year);
    } else {
      const modalHeader = document.getElementById('modalHeaderTitle');
      if (modalHeader) modalHeader.innerHTML = `<i class="ri-camera-lens-line"></i> Khoảnh khắc & Chi tiêu ngày ${day}/${month}/${year}`;
      if (typeof populateWalletDropdown === 'function') populateWalletDropdown();
      const cameraModal = document.getElementById('cameraModal');
      if (cameraModal) cameraModal.classList.add('show');
    }
  }

  function openDayDetailModal(day, dayTxs, month, year) {
    const modal = document.getElementById('dayDetailModal');
    const title = document.getElementById('dayDetailTitle');
    const body = document.getElementById('dayDetailBody');

    title.innerHTML = `<i class="ri-calendar-event-line"></i> Khoảnh khắc ngày ${day}/${month}/${year}`;

    body.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="primary jelly-btn" id="btnAddForThisDate">
          <i class="ri-camera-fill"></i> Thêm ảnh & chi tiêu cho ngày này
        </button>
      </div>
      <ul class="tx-list">
        ${dayTxs.map(t => `
          <li class="tx">
            ${t.image ? `<img src="${t.image}" class="tx-thumb" alt="Moment">` : `<div class="tx-ico">${getCategoryIcon(t.category)}</div>`}
            <div class="tx-info">
              <strong>${escapeHtml(t.title)}</strong>
              <small>${t.category} • ${t.wallet || 'Tiền mặt'}</small>
            </div>
            <div class="tx-amt ${t.type === 'income' ? 'pos' : 'neg'}">
              ${t.type === 'income' ? '+' : '-'}${formatVND(t.amount)}
            </div>
          </li>
        `).join('')}
      </ul>
    `;

    body.querySelector('#btnAddForThisDate').onclick = () => {
      modal.classList.remove('show');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      document.getElementById('selectedDateInput').value = dateStr;
      document.getElementById('modalHeaderTitle').innerHTML = `<i class="ri-camera-lens-line"></i> Thêm giao dịch ngày ${day}/${month}/${year}`;
      if (typeof populateWalletDropdown === 'function') populateWalletDropdown();
      document.getElementById('cameraModal').classList.add('show');
    };

    modal.classList.add('show');
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

      const dayExp = txs.filter(t => {
        const td = new Date(t.date);
        return t.type === 'expense' && td.toDateString() === d.toDateString();
      }).reduce((sum, t) => sum + Number(t.amount), 0);

      last7Days.push({
        label: i === 0 ? 'Hôm nay' : days[d.getDay()],
        amount: dayExp
      });
    }

    const maxExp = Math.max(...last7Days.map(x => x.amount), 100000);

    chartEl.innerHTML = last7Days.map(item => {
      const heightPct = Math.max(4, Math.min(100, Math.round((item.amount / maxExp) * 100)));
      return `
        <div class="wk">
          <span class="wk-amt">${item.amount > 0 ? formatVND(item.amount) : ''}</span>
          <div class="wk-bar" style="height: ${heightPct}%;"></div>
          <span>${item.label}</span>
        </div>
      `;
    }).join('');
  }

  function renderPieDonutChart(txs) {
    const svgEl = container.querySelector('#donutSvg');
    const legendEl = container.querySelector('#pieLegend');

    const catTotals = {};
    let totalExp = 0;

    txs.filter(t => t.type === 'expense').forEach(t => {
      const amt = Number(t.amount);
      const cat = t.category || 'Ăn uống';
      catTotals[cat] = (catTotals[cat] || 0) + amt;
      totalExp += amt;
    });

    if (totalExp === 0) {
      svgEl.innerHTML = '<circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" stroke-width="3.8"></circle>';
      legendEl.innerHTML = '<p class="empty" style="padding:0; color:var(--muted);">Chưa có dữ liệu chi tiêu</p>';
      return;
    }

    const colors = {
      'Ăn uống': '#10b981',
      'Học tập': '#06b6d4',
      'Xe cộ': '#f59e0b',
      'Nhà ở': '#8b5cf6',
      'Giải trí': '#f43f5e',
      'Thu nhập': '#3b82f6'
    };

    let accumulatedPercent = 0;
    let svgPaths = '';
    let legendHTML = '';

    Object.keys(catTotals).forEach(cat => {
      const amt = catTotals[cat];
      const pct = (amt / totalExp) * 100;
      const color = colors[cat] || '#ec4899';

      const dashArray = `${pct} ${100 - pct}`;
      const dashOffset = 100 - accumulatedPercent;

      svgPaths += `<circle cx="18" cy="18" r="15.915" fill="none" stroke="${color}" stroke-width="4.2" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}"></circle>`;

      legendHTML += `
        <div class="pie-legend-item">
          <div><span class="pie-color-dot" style="background:${color};"></span>${cat}</div>
          <b>${Math.round(pct)}%</b>
        </div>
      `;

      accumulatedPercent += pct;
    });

    svgEl.innerHTML = svgPaths;
    legendEl.innerHTML = legendHTML;
  }

  function renderTxList(txs, currentUserId) {
    const listEl = container.querySelector('#txList');
    container.querySelector('#txCount').textContent = `${txs.length} khoản`;

    if (txs.length === 0) {
      listEl.innerHTML = '<p class="empty" style="text-align:center; padding:16px; color:var(--muted);">Chưa có giao dịch nào!</p>';
      return;
    }

    listEl.innerHTML = txs.map(t => `
      <li class="tx">
        ${t.image ? `<img src="${t.image}" class="tx-thumb" alt="Bill">` : `<div class="tx-ico">${getCategoryIcon(t.category)}</div>`}
        <div class="tx-info">
          <strong>${escapeHtml(t.title)}</strong>
          <small>${new Date(t.date).toLocaleDateString('vi-VN')} • ${escapeHtml(t.wallet || 'Tiền mặt')} • ${escapeHtml(t.category)}</small>
        </div>
        <div class="tx-amt ${t.type === 'income' ? 'pos' : 'neg'}">
          ${t.type === 'income' ? '+' : '-'}${formatVND(t.amount)}
        </div>
        <button class="tx-del-btn jelly-btn" data-id="${t.id}" title="Xóa khoản này"><i class="ri-delete-bin-line"></i></button>
      </li>
    `).join('');

    listEl.querySelectorAll('.tx-del-btn').forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Bạn có muốn xóa khoản này không?')) {
          await saveAndQueue({
            user_id: String(currentUserId),
            entity: 'transaction',
            action: 'delete',
            record: { id }
          });
          const toast = document.getElementById('toast');
          if (toast) {
            toast.textContent = 'Đã xóa giao dịch!';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
          }
          await loadAndRenderDashboard();
        }
      };
    });
  }
}

function normalizeCatName(cat) {
  const map = {
    'food': 'Ăn uống',
    'study': 'Học tập',
    'transport': 'Xe cộ',
    'housing': 'Nhà ở',
    'other_expense': 'Nhà ở',
    'shopping': 'Giải trí',
    'entertainment': 'Giải trí',
    'salary': 'Thu nhập',
    'allowance': 'Thu nhập',
    'bonus': 'Thu nhập',
    'other_income': 'Thu nhập'
  };
  return map[cat] || cat || 'Ăn uống';
}

function getCategoryIcon(cat) {
  const icons = {
    'Ăn uống': '🍜',
    'Học tập': '📚',
    'Xe cộ': '🛵',
    'Nhà ở': '🏠',
    'Giải trí': '🎮',
    'Thu nhập': '💰'
  };
  return icons[cat] || '💸';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
