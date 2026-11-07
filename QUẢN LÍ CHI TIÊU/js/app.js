let currentImageData = null;
let activeWalletFilter = 'all';

let currentViewYear = 2026;
let currentViewMonth = 10;

let catTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  createFallingCoinsAndWallets();
  await initDB();
  
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      checkOnboarding();
    }, 600);
  }, 2000);

  renderApp();
  setupEvents();
  registerServiceWorker();
  setupJellyButtonSparks();
});

function setupJellyButtonSparks() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.jelly-btn, button, .wallet-chip, .cats label');
    if (btn) {
      spawnCoinSparksAtPoint(e.clientX, e.clientY, 5);
    }
  });
}

function spawnCoinSparksAtPoint(x, y, count = 6) {
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

function popCoinsFromElement(el, event) {
  const rect = el.getBoundingClientRect();
  const x = event ? event.clientX : (rect.left + rect.width / 2);
  const y = event ? event.clientY : (rect.top + rect.height / 2);

  el.style.transform = 'scale(1.3) rotate(15deg)';
  setTimeout(() => el.style.transform = '', 250);

  spawnCoinSparksAtPoint(x, y, 12);
}

function triggerRainCoinsEffect() {
  const fxLayer = document.getElementById('fxLayer');
  const items = ['💰', '🪙', '💵', '✨', '💎'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'falling-item';
    el.textContent = items[Math.floor(Math.random() * items.length)];

    const left = Math.random() * 100;
    const duration = 1.2 + Math.random() * 1.8;
    const delay = Math.random() * 0.8;
    const size = 1.5 + Math.random() * 1.5;

    el.style.left = `${left}%`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.fontSize = `${size}rem`;

    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay) * 1000);
  }
}

function triggerExpenseFlyEffect() {
  const heroCard = document.getElementById('heroCard');
  heroCard.classList.add('shake-effect');
  setTimeout(() => heroCard.classList.remove('shake-effect'), 600);

  const rect = heroCard.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const items = ['💸', '😿', '😭', '💸', '💸'];
  for (let i = 0; i < 15; i++) {
    const el = document.createElement('div');
    el.className = 'particle-coin';
    el.textContent = items[Math.floor(Math.random() * items.length)];
    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 100;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 40;

    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

function triggerCatAlertPopup() {
  const popup = document.getElementById('catAlertOverlay');
  const catCard = document.getElementById('catAlertCard');
  const moneyBurst = document.getElementById('catMoneyBurst');

  popup.classList.add('show');
  catCard.classList.add('shake-cat');
  setTimeout(() => catCard.classList.remove('shake-cat'), 700);

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

  if (catTimer) clearTimeout(catTimer);
  catTimer = setTimeout(() => {
    closeCatAlert();
  }, 5000);
}

function closeCatAlert() {
  document.getElementById('catAlertOverlay').classList.remove('show');
  if (catTimer) clearTimeout(catTimer);
}

function createFallingCoinsAndWallets() {
  const container = document.getElementById('fallingContainer');
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

function checkOnboarding() {
  const userName = localStorage.getItem('student_name');
  const modal = document.getElementById('onboardModal');
  
  if (!userName || userName.trim() === '') {
    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
    document.getElementById('userHeaderName').textContent = `Chào ${userName} 👋`;
  }
}

function saveUserName() {
  const nameInput = document.getElementById('userNameInput');
  const name = nameInput.value.trim();
  
  if (name !== '') {
    localStorage.setItem('student_name', name);
    document.getElementById('userHeaderName').textContent = `Chào ${name} 👋`;
    document.getElementById('onboardModal').style.display = 'none';
  } else {
    alert('Vui lòng nhập tên của bạn nhé!');
  }
}

function getMonthlyBudget() {
  return Number(localStorage.getItem('user_monthly_budget')) || 3000000;
}

function openBudgetModal() {
  document.getElementById('monthlyBudgetInput').value = getMonthlyBudget();
  document.getElementById('budgetModal').classList.add('show');
}

function saveMonthlyBudget() {
  const val = Number(document.getElementById('monthlyBudgetInput').value);
  if (val && val > 0) {
    localStorage.setItem('user_monthly_budget', val);
    document.getElementById('budgetModal').classList.remove('show');
    showToast('Đã cập nhật ngân sách tháng!');
    renderApp();
  }
}

function changeMonth(direction) {
  currentViewMonth += direction;
  if (currentViewMonth > 11) {
    currentViewMonth = 0;
    currentViewYear++;
  } else if (currentViewMonth < 0) {
    currentViewMonth = 11;
    currentViewYear--;
  }
  renderApp();
}

function animateCountUp(targetVal, elementId) {
  const el = document.getElementById(elementId);
  const startVal = 0;
  const duration = 800;
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

async function renderApp() {
  const allTxs = await getAllTransactions();
  const monthlyBudget = getMonthlyBudget();
  
  const filteredTxs = activeWalletFilter === 'all' 
    ? allTxs 
    : allTxs.filter(t => (t.wallet || 'Ví tiền mặt') === activeWalletFilter);

  let income = 0;
  let expense = 0;
  let todayExp = 0;
  const todayStr = new Date().toDateString();

  filteredTxs.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      income += amt;
    } else {
      expense += amt;
      if (new Date(t.date).toDateString() === todayStr) {
        todayExp += amt;
      }
    }
  });

  const balance = income - expense;
  const remainingBudget = monthlyBudget - expense;

  animateCountUp(balance, 'totalBalance');
  document.getElementById('totalRemaining').textContent = formatVND(remainingBudget);
  document.getElementById('totalIncome').textContent = formatVND(income);
  document.getElementById('totalExpenseChip').textContent = formatVND(expense);

  const usedPercent = Math.min(100, Math.max(0, Math.round((expense / monthlyBudget) * 100))) || 0;
  document.getElementById('budgetPercentText').textContent = `${usedPercent}%`;
  document.getElementById('budgetUsedAmountText').textContent = `${formatVND(expense)} / ${formatVND(monthlyBudget)}`;
  document.getElementById('budgetProgressBar').style.width = `${usedPercent}%`;

  const statusEl = document.getElementById('todayExpenseStatus');
  if (todayExp > 0) {
    statusEl.textContent = `Đã chi ${formatVND(todayExp)}`;
    statusEl.style.color = 'var(--danger)';
  } else {
    statusEl.textContent = 'Chưa chi tiêu';
    statusEl.style.color = 'var(--primary)';
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
  const dailyBudget = Math.max(0, Math.round(remainingBudget / remainingDays));
  document.getElementById('dailyBudget').textContent = `${formatVND(dailyBudget)}/ngày (${remainingDays} ngày còn lại)`;

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  document.getElementById('locketMonthTitle').textContent = `${monthNames[currentViewMonth]} ${currentViewYear}`;

  renderCalendarGrid(filteredTxs);
  renderWeeklyChart(filteredTxs);
  renderPieDonutChart(filteredTxs);
  renderTxList(filteredTxs);
}

function renderCalendarGrid(txs) {
  const grid = document.getElementById('calendarGrid');
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
    dayEl.style.animationDelay = `${(d % 10) * 0.04}s`;

    dayEl.onclick = (e) => {
      openCameraModalForDate(d, currentViewMonth + 1, currentViewYear, dayTxs);
    };
    
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

function openCameraModalForDate(day, month, year, dayTxs) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  document.getElementById('selectedDateInput').value = dateStr;
  document.getElementById('modalHeaderTitle').innerHTML = `<i class="ri-camera-lens-line"></i> Khoảnh khắc & Chi tiêu ngày ${day}/${month}/${year}`;
  
  if (dayTxs.length > 0) {
    openDayDetailModal(day, dayTxs, month, year);
  } else {
    document.getElementById('cameraModal').classList.add('show');
  }
}

function renderWeeklyChart(txs) {
  const chartEl = document.getElementById('weeklyChart');
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

  chartEl.innerHTML = last7Days.map((item, index) => {
    const heightPct = Math.max(4, Math.min(100, Math.round((item.amount / maxExp) * 100)));
    return `
      <div class="wk">
        <span class="wk-amt">${item.amount > 0 ? formatVND(item.amount) : ''}</span>
        <div class="wk-bar" id="wkBar_${index}" style="height: 0%;"></div>
        <span>${item.label}</span>
      </div>
    `;
  }).join('');

  setTimeout(() => {
    last7Days.forEach((item, index) => {
      const heightPct = Math.max(4, Math.min(100, Math.round((item.amount / maxExp) * 100)));
      const bar = document.getElementById(`wkBar_${index}`);
      if (bar) bar.style.height = `${heightPct}%`;
    });
  }, 100);
}

function renderPieDonutChart(txs) {
  const svgEl = document.getElementById('donutSvg');
  const legendEl = document.getElementById('pieLegend');
  
  const catTotals = {};
  let totalExp = 0;

  txs.filter(t => t.type === 'expense').forEach(t => {
    const amt = Number(t.amount);
    catTotals[t.category] = (catTotals[t.category] || 0) + amt;
    totalExp += amt;
  });

  if (totalExp === 0) {
    svgEl.innerHTML = '<circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" stroke-width="3.8"></circle>';
    legendEl.innerHTML = '<p class="empty" style="padding:0;">Chưa có dữ liệu phân tích</p>';
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

    svgPaths += `<circle cx="18" cy="18" r="15.915" fill="none" stroke="${color}" stroke-width="4.2" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" style="transition: stroke-dasharray 1s ease;"></circle>`;
    
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

function renderTxList(txs) {
  const listEl = document.getElementById('txList');
  document.getElementById('txCount').textContent = `${txs.length} khoản`;

  if (txs.length === 0) {
    listEl.innerHTML = '<p class="empty">Chưa có giao dịch nào!</p>';
    return;
  }

  listEl.innerHTML = txs.map(t => `
    <li class="tx">
      ${t.image ? `<img src="${t.image}" class="tx-thumb" alt="Bill">` : `<div class="tx-ico">${getCategoryIcon(t.category)}</div>`}
      <div class="tx-info">
        <strong>${escapeHtml(t.title)}</strong>
        <small>${new Date(t.date).toLocaleDateString('vi-VN')} • ${t.wallet || 'Tiền mặt'} • ${t.category}</small>
      </div>
      <div class="tx-amt ${t.type === 'income' ? 'pos' : 'neg'}">
        ${t.type === 'income' ? '+' : '-'}${formatVND(t.amount)}
      </div>
      <button class="tx-del-btn jelly-btn" onclick="onDeleteTx(${t.id})" title="Xóa khoản này"><i class="ri-delete-bin-line"></i></button>
    </li>
  `).join('');
}

async function onDeleteTx(id) {
  if (confirm('Bạn có muốn xóa khoản này không?')) {
    await deleteTransaction(id);
    showToast('Đã xóa giao dịch!');
    renderApp();
  }
}

function openDayDetailModal(day, dayTxs, month, year) {
  const modal = document.getElementById('dayDetailModal');
  const title = document.getElementById('dayDetailTitle');
  const body = document.getElementById('dayDetailBody');

  title.innerHTML = `<i class="ri-calendar-event-line"></i> Khoảnh khắc ngày ${day}/${month}/${year}`;

  body.innerHTML = `
    <div style="margin-bottom: 16px;">
      <button class="primary jelly-btn" onclick="triggerAddForDate('${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}')">
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
  modal.classList.add('show');
}

function triggerAddForDate(dateStr) {
  document.getElementById('dayDetailModal').classList.remove('show');
  document.getElementById('selectedDateInput').value = dateStr;
  document.getElementById('cameraModal').classList.add('show');
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentImageData = e.target.result;
    
    const preview = document.getElementById('photoPreview');
    preview.src = currentImageData;
    preview.style.display = 'block';
    document.getElementById('cameraPlaceholder').style.display = 'none';

    const scanOverlay = document.getElementById('scanOverlay');
    scanOverlay.style.display = 'flex';
    document.getElementById('scanBadge').textContent = '(Đang quét Hóa Đơn AI...)';

    Tesseract.recognize(currentImageData, 'eng+vie')
      .then(({ data: { text } }) => {
        scanOverlay.style.display = 'none';
        const numbers = text.match(/\b\d{1,3}(?:[.,]\d{3})*(?:\s*đ|\s*VND)?\b/gi);
        let detectedAmount = 0;

        if (numbers) {
          numbers.forEach(numStr => {
            const cleanNum = parseInt(numStr.replace(/[^0-9]/g, ''), 10);
            if (cleanNum >= 1000 && cleanNum > detectedAmount && cleanNum < 100000000) {
              detectedAmount = cleanNum;
            }
          });
        }

        if (detectedAmount > 0) {
          document.getElementById('photoAmount').value = detectedAmount;
          document.getElementById('scanBadge').textContent = '✨ Đã tự động nhận diện giá bill!';
        } else {
          document.getElementById('scanBadge').textContent = '(Chưa nhận diện được giá, hãy nhập tay)';
        }
      })
      .catch(() => {
        scanOverlay.style.display = 'none';
        document.getElementById('scanBadge').textContent = '(Nhập tay giá chi tiêu)';
      });
  };
  reader.readAsDataURL(file);
}

function setupEvents() {
  const btnSaveName = document.getElementById('btnSaveName');
  if (btnSaveName) btnSaveName.addEventListener('click', saveUserName);

  const userNameInput = document.getElementById('userNameInput');
  if (userNameInput) {
    userNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveUserName();
    });
  }

  document.getElementById('openCamBtn').addEventListener('click', () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    document.getElementById('selectedDateInput').value = dateStr;
    document.getElementById('modalHeaderTitle').innerHTML = `<i class="ri-camera-lens-line"></i> Thêm khoảnh khắc hôm nay`;
    document.getElementById('cameraModal').classList.add('show');
  });

  document.getElementById('closeCamBtn').addEventListener('click', closeCameraModal);
  
  document.getElementById('closeBudgetBtn').addEventListener('click', () => {
    document.getElementById('budgetModal').classList.remove('show');
  });

  document.getElementById('closeDayDetailBtn').addEventListener('click', () => {
    document.getElementById('dayDetailModal').classList.remove('show');
  });

  document.getElementById('btnChooseImage').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });

  document.getElementById('imageInput').addEventListener('change', handleImageSelect);

  const form = document.getElementById('photoTxForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = Number(document.getElementById('photoAmount').value);
    const title = document.getElementById('photoTitle').value;
    const type = form.elements['photoType'].value;
    const category = form.elements['photoCat'].value;
    const wallet = document.getElementById('photoWallet').value;
    const customDate = document.getElementById('selectedDateInput').value;

    let finalDate = new Date().toISOString();
    if (customDate) {
      finalDate = new Date(customDate + 'T12:00:00').toISOString();
    }

    await addTransaction({
      amount,
      title,
      type,
      category,
      wallet,
      image: currentImageData,
      date: finalDate
    });

    closeCameraModal();

    if (type === 'income') {
      triggerRainCoinsEffect();
      showToast(`Ting ting! +${formatVND(amount)} 💰`);
    } else {
      triggerExpenseFlyEffect();
      showToast('Đã ghi nhận khoản chi!');

      if (amount >= 100000) {
        setTimeout(() => triggerCatAlertPopup(), 300);
      }
    }

    renderApp();
  });

  document.querySelectorAll('.wallet-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.wallet-chip').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeWalletFilter = e.currentTarget.getAttribute('data-wallet');
      renderApp();
    });
  });
}

function closeCameraModal() {
  document.getElementById('cameraModal').classList.remove('show');
  document.getElementById('photoTxForm').reset();
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('cameraPlaceholder').style.display = 'block';
  document.getElementById('scanBadge').textContent = '';
  currentImageData = null;
}

function formatVND(amt) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function getCategoryIcon(cat) {
  const icons = { 'Ăn uống': '🍜', 'Học tập': '📚', 'Xe cộ': '🛵', 'Nhà ở': '🏠', 'Giải trí': '🎮', 'Thu nhập': '💰' };
  return icons[cat] || '💸';
}

function escapeHtml(str) {
  return str.replace(/[\&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
  }
}