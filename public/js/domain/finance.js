/** Pure shared money functions; no network, DOM, storage or model calls. */
function integer(value, name) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${name} must be a safe integer`);
}
export function isValidAmount(value) { return Number.isSafeInteger(value) && value > 0; }

export function getMonthTotals(transactions, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new TypeError('Invalid month');
  let income = 0, expense = 0;
  for (const row of transactions) {
    if (row.deleted_at || !row.occurred_on?.startsWith(`${month}-`)) continue;
    if (!['income', 'expense', 'transfer'].includes(row.type)) throw new TypeError('Invalid type');
    if (!isValidAmount(row.amount_vnd)) throw new TypeError('Invalid amount_vnd');
    if (row.type === 'income') income += row.amount_vnd;
    if (row.type === 'expense') expense += row.amount_vnd;
    integer(income, 'income'); integer(expense, 'expense');
  }
  integer(income - expense, 'net');
  return { income_vnd: income, expense_vnd: expense, net_vnd: income - expense };
}

export function simulatePurchase({ balance_vnd, budget_remaining_vnd, price_vnd, days_remaining, reserved_vnd = 0 }) {
  for (const [name, value] of Object.entries({ balance_vnd, budget_remaining_vnd, price_vnd, days_remaining, reserved_vnd })) integer(value, name);
  if (!isValidAmount(price_vnd) || days_remaining < 1 || reserved_vnd < 0) throw new RangeError('Invalid simulation input');
  const before = Math.min(balance_vnd - reserved_vnd, budget_remaining_vnd);
  const balanceAfter = balance_vnd - price_vnd;
  const budgetAfter = budget_remaining_vnd - price_vnd;
  const after = Math.min(balanceAfter - reserved_vnd, budgetAfter);
  for (const value of [before, balanceAfter, budgetAfter, after]) integer(value, 'result');
  return {
    balance_before_vnd: balance_vnd, balance_after_vnd: balanceAfter,
    budget_before_vnd: budget_remaining_vnd, budget_after_vnd: budgetAfter,
    flexible_before_vnd: before, flexible_after_vnd: after,
    daily_before_vnd: Math.floor(before / days_remaining),
    daily_after_vnd: Math.floor(after / days_remaining),
    exceeds_available: after < 0,
  };
}

/**
 * Số dư ban đầu của ví theo contract là opening_balance_vnd. Ví tạo ở Thu chi trước bản sửa
 * chỉ có initial_balance_vnd cho tới khi đồng bộ (server tự đổi tên), nên đọc cả tên cũ để
 * số dư trên cùng máy không bị coi là 0 khi chưa đồng bộ.
 */
export function openingBalanceOf(wallet) {
  const value = wallet?.opening_balance_vnd ?? wallet?.initial_balance_vnd ?? 0;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : 0;
}

/**
 * Tính số dư của từng ví dựa trên số dư ban đầu và lịch sử giao dịch.
 * Ví riêng = opening + thu vào ví - chi từ ví - chuyển đi + nhận chuyển khoản.
 */
export function calculateWalletBalances(wallets, transactions) {
  const balances = new Map();
  for (const w of wallets) {
    if (w.deleted_at) continue;
    balances.set(w.id, openingBalanceOf(w));
  }

  for (const tx of transactions) {
    if (tx.deleted_at) continue;
    if (!isValidAmount(tx.amount_vnd)) continue;

    if (tx.type === 'income') {
      if (balances.has(tx.wallet_id)) {
        balances.set(tx.wallet_id, balances.get(tx.wallet_id) + tx.amount_vnd);
      }
    } else if (tx.type === 'expense') {
      if (balances.has(tx.wallet_id)) {
        balances.set(tx.wallet_id, balances.get(tx.wallet_id) - tx.amount_vnd);
      }
    } else if (tx.type === 'transfer') {
      // Ví gửi bị trừ
      if (balances.has(tx.wallet_id)) {
        balances.set(tx.wallet_id, balances.get(tx.wallet_id) - tx.amount_vnd);
      }
      // Ví nhận được cộng
      if (tx.destination_wallet_id && balances.has(tx.destination_wallet_id)) {
        balances.set(tx.destination_wallet_id, balances.get(tx.destination_wallet_id) + tx.amount_vnd);
      }
    }
  }

  return balances;
}

/**
 * Tính tổng số dư của tất cả các ví:
 * Tổng = tổng số dư mở đầu các ví + toàn bộ thu - toàn bộ chi.
 * Giao dịch chuyển khoản (transfer) không làm thay đổi tổng số dư.
 */
export function calculateTotalBalance(wallets, transactions) {
  let total = 0;
  for (const w of wallets) {
    if (!w.deleted_at) {
      total += openingBalanceOf(w);
    }
  }

  for (const tx of transactions) {
    if (tx.deleted_at) continue;
    if (!isValidAmount(tx.amount_vnd)) continue;

    if (tx.type === 'income') {
      total += tx.amount_vnd;
    } else if (tx.type === 'expense') {
      total -= tx.amount_vnd;
    }
    // Chuyển khoản transfer không làm thay đổi tổng tài sản
  }

  return total;
}

export function formatVND(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function pickMonthBudget(budgets, month) {
  // Server giữ một hạn mức cho mỗi user + tháng. Nếu máy tạm có hai bản ghi (hai thiết bị cùng tạo
  // khi offline), ưu tiên bản đang chờ đồng bộ rồi tới bản cập nhật sau cùng để mọi màn chọn giống nhau.
  const rows = budgets.filter(row => row && !row.deleted_at && row.month === month);
  rows.sort((a, b) => Number(b.sync_status === 'pending') - Number(a.sync_status === 'pending')
    || String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? ''))
    || (Number(b.version) || 0) - (Number(a.version) || 0));
  return rows[0] ?? null;
}

/**
 * Nguồn chung cho "Ngân sách còn lại" ở Tổng quan, Ngân sách và Mô phỏng.
 * Ngân sách còn lại = hạn mức tháng − tổng chi tháng (mọi ví, không tính thu và chuyển ví).
 * Hạn mức là giới hạn chi, không phải tiền đang có trong ví.
 * state: 'unset' (chưa đặt hạn mức), 'ok' (còn > 0), 'zero' (còn đúng 0đ), 'over' (vượt).
 */
export function getMonthBudgetStatus(budgets, transactions, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new TypeError('Invalid month');
  const spent = getMonthTotals(transactions, month).expense_vnd;
  const budget = pickMonthBudget(budgets, month);
  if (!budget) return { month, budget_id: null, limit_vnd: null, spent_vnd: spent, remaining_vnd: null, state: 'unset' };
  const limit = Number(budget.limit_vnd);
  if (!isValidAmount(limit)) throw new TypeError('Invalid limit_vnd');
  const remaining = limit - spent;
  integer(remaining, 'remaining');
  return {
    month, budget_id: budget.id ?? null, limit_vnd: limit, spent_vnd: spent, remaining_vnd: remaining,
    state: remaining > 0 ? 'ok' : remaining === 0 ? 'zero' : 'over',
  };
}

/** Số ngày còn lại trong tháng, tính cả hôm nay. today dạng YYYY-MM-DD theo ngày địa phương. */
export function daysLeftInMonth(today) {
  const [y, m, d] = String(today).split('-').map(Number);
  return new Date(y, m, 0).getDate() - d + 1;
}

/** Mức chi mỗi ngày từ ngân sách còn lại; làm tròn xuống, không âm. */
export function dailyAllowance(remaining_vnd, days) {
  if (remaining_vnd === null || !(days >= 1)) return null;
  return Math.max(0, Math.floor(remaining_vnd / days));
}
