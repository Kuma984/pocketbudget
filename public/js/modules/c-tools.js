import { calculateTotalBalance, daysLeftInMonth, getMonthBudgetStatus, getMonthTotals, isValidAmount } from '../domain/finance.js';
import { CATEGORIES } from '../config.js';

export const categoryLabels = {
  allowance: 'Trợ cấp', salary: 'Lương', scholarship: 'Học bổng', other_income: 'Thu nhập khác',
  food: 'Ăn uống', transport: 'Đi lại', study: 'Học tập', shopping: 'Mua sắm',
  entertainment: 'Giải trí', health: 'Sức khỏe', other_expense: 'Chi phí khác',
};

export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export const todayLocal = (now = new Date()) => [
  String(now.getFullYear()).padStart(4, '0'),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-');

export function isDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value;
}
export function resolveMonth(period, today = todayLocal()) {
  if (period === 'this_month') return today.slice(0, 7);
  if (period === 'last_month') {
    const [year, month] = today.split('-').map(Number);
    return todayLocal(new Date(year, month - 2, 1)).slice(0, 7);
  }
  if (typeof period === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(period)) return period;
  throw new Error('Hãy chọn tháng muốn xem.');
}

export function readLocalOverview(wallets, transactions, budgets, today = todayLocal()) {
  const activeWallets = wallets.filter(row => !row.deleted_at);
  const activeTransactions = transactions.filter(row => !row.deleted_at);
  const balance = calculateTotalBalance(activeWallets, activeTransactions);
  if (!Number.isSafeInteger(balance)) throw new Error('Số dư vượt giới hạn tính toán.');
  const month = today.slice(0, 7);
  let status;
  try {
    status = getMonthBudgetStatus(budgets, activeTransactions, month);
  } catch {
    throw new Error('Có giao dịch hoặc hạn mức tháng ' + month + ' không hợp lệ trong sổ trên máy.');
  }
  const pending = [...activeWallets, ...activeTransactions, ...budgets]
    .filter(row => row.sync_status && row.sync_status !== 'synced').length;
  return {
    balance, remaining: status.remaining_vnd, days: daysLeftInMonth(today),
    month, limit: status.limit_vnd, spent: status.spent_vnd, state: status.state,
    wallet_count: activeWallets.length, pending,
  };
}

/**
 * Chữ cho dòng "Khả năng chi tiêu" của bảng Mô phỏng. Chỉ đổi cách hiển thị, không đổi công thức:
 * - tiền linh hoạt dương: dùng mức/ngày simulatePurchase đã tính (làm tròn xuống như cũ);
 * - bằng 0: không còn tiền linh hoạt;
 * - âm: tổng số tiền thiếu = |tiền linh hoạt|, không chia theo ngày (chia ra dễ hiểu nhầm là "được chi âm mỗi ngày").
 * Số thiếu lấy từ tiền linh hoạt chứ không từ số dư, vì tiền giữ riêng hoặc ngân sách thấp hơn có thể là giới hạn.
 */
export function describeSpendingCapacity(flexible_vnd, daily_vnd) {
  if (flexible_vnd > 0) return { tone: 'ok', text: `Có thể chi khoảng ${money(daily_vnd)}/ngày`, daily: money(daily_vnd) };
  if (flexible_vnd === 0) return { tone: 'zero', text: 'Không còn tiền linh hoạt để chi' };
  return { tone: 'short', text: `Thiếu ${money(Math.abs(flexible_vnd))}` };
}

export function expenseSummary(rows, period, category = null, today = todayLocal()) {
  const month = resolveMonth(period, today);
  if (category !== null && !CATEGORIES.expense.includes(category)) throw new Error('Danh mục chi không hợp lệ.');
  const expenses = rows.filter(row => !row.deleted_at && row.type === 'expense' &&
    row.occurred_on?.slice(0, 7) === month && (!category || row.category_code === category));
  return {
    month, total: getMonthTotals(expenses, month).expense_vnd, count: expenses.length,
    unsynced: expenses.filter(row => row.sync_status && row.sync_status !== 'synced').length,
  };
}

export function validateDraft(input, wallets) {
  const { type, amount_vnd, wallet_id, destination_wallet_id, category_code, occurred_on, note } = input;
  if (!['income', 'expense', 'transfer'].includes(type)) throw new Error('Chọn loại giao dịch.');
  if (!isValidAmount(amount_vnd)) throw new Error('Số tiền phải là số nguyên dương hợp lệ.');
  if (!wallets.some(row => row.id === wallet_id)) throw new Error('Chọn một ví của tài khoản.');
  if (!isDate(occurred_on)) throw new Error('Ngày giao dịch không hợp lệ.');
  if (typeof note !== 'string' || note.length > 500) throw new Error('Ghi chú quá dài.');
  if (type === 'transfer') {
    if (destination_wallet_id === wallet_id || !wallets.some(row => row.id === destination_wallet_id)) {
      throw new Error('Chọn ví nhận khác ví chuyển.');
    }
  } else if (!CATEGORIES[type].includes(category_code)) throw new Error('Chọn danh mục đúng loại giao dịch.');
  return {
    type, amount_vnd, wallet_id, occurred_on, note: note.trim(),
    destination_wallet_id: type === 'transfer' ? destination_wallet_id : null,
    category_code: type === 'transfer' ? null : category_code,
  };
}

export function el(tag, value, attributes = {}) {
  const node = document.createElement(tag);
  if (value !== null && value !== undefined) node.textContent = value;
  for (const [key, item] of Object.entries(attributes)) node.setAttribute(key, item);
  return node;
}

export function field(form, label, name, options = {}) {
  const wrap = el('label', null, { class: 'field c-field' });
  const caption = el('span', label, { class: 'c-label' });
  const { tag = 'input', value = '', ...attributes } = options;
  // Luôn có type cho input: style chung chỉ áp cho input[type=text|number|date…].
  if (tag === 'input' && !attributes.type) attributes.type = 'text';
  if (tag === 'select' && !attributes.class) attributes.class = 'select-field';
  const input = el(tag, null, { name, ...attributes });
  input.value = value;
  wrap.append(caption, input);
  form.append(wrap);
  return input;
}

export const action = (label, type = 'button', variant = type === 'submit' ? 'primary' : 'secondary') =>
  el('button', label, { type, class: variant === 'primary' ? 'primary c-btn' : 'btn-secondary c-btn' });
export function say(target, message, error = false) {
  target.textContent = message;
  target.classList.toggle('c-error', error);
}
export function addOption(select, value, label) {
  select.append(el('option', label, { value }));
}
