import { calculateTotalBalance, getMonthTotals, isValidAmount } from '../domain/finance.js';
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
  const balance = calculateTotalBalance(wallets, transactions);
  if (!Number.isSafeInteger(balance)) throw new Error('Số dư vượt giới hạn tính toán.');
  const month = today.slice(0, 7);
  const budget = budgets.find(row => row.month === month && !row.deleted_at);
  const expense = getMonthTotals(transactions, month).expense_vnd;
  if (budget && !isValidAmount(budget.limit_vnd)) throw new Error('Hạn mức không hợp lệ.');
  const remaining = budget ? budget.limit_vnd - expense : null;
  if (remaining !== null && !Number.isSafeInteger(remaining)) throw new Error('Ngân sách vượt giới hạn tính toán.');
  const [y, m, d] = today.split('-').map(Number);
  return { balance, remaining, days: new Date(y, m, 0).getDate() - d + 1 };
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
  const wrap = el('label', label, { class: 'c-field' });
  const { tag = 'input', value = '', ...attributes } = options;
  const input = el(tag, null, { name, ...attributes });
  input.value = value;
  wrap.append(input);
  form.append(wrap);
  return input;
}

export const action = (label, type = 'button') => el('button', label, { type });
export function say(target, message, error = false) {
  target.textContent = message;
  target.classList.toggle('c-error', error);
}
export function addOption(select, value, label) {
  select.append(el('option', label, { value }));
}
