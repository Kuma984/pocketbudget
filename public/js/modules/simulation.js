import { simulatePurchase } from '../domain/finance.js';
import { getCSession, openWishlist, readCRecords, takeSimulationPreset } from './c-context.js';
import { action, el, field, money, readLocalOverview, say, todayLocal } from './c-tools.js';

export function render(container) {
  const root = el('section', null, { class: 'card c-module' });
  container.replaceChildren(root);
  root.append(el('h2', 'Mô phỏng trước khi mua'), el('p', 'Xem số dư và ngân sách thay đổi thế nào nếu mua món này. Mô phỏng không ghi vào sổ.'));
  const preset = takeSimulationPreset();
  const status = el('p', 'Nhập số liệu giả định hoặc lấy số liệu từ sổ trên thiết bị.', { role: 'status' });
  const form = el('form', null, { class: 'c-grid' });
  const integer = { type: 'number', step: '1', required: '' };
  const item = field(form, 'Tên món', 'item', { maxlength: '120', value: preset?.item_name ?? '' });
  const price = field(form, 'Giá món (đ)', 'price', { ...integer, min: '1', value: preset?.price_vnd ?? '' });
  const balance = field(form, 'Số dư hiện tại (đ)', 'balance', integer);
  const budget = field(form, 'Ngân sách còn lại (đ)', 'budget', integer);
  const days = field(form, 'Số ngày còn lại', 'days', { ...integer, min: '1', max: '366' });
  const reserved = field(form, 'Tiền muốn giữ riêng (đ)', 'reserved', { ...integer, min: '0', value: '0' });
  const actions = el('div', null, { class: 'c-actions' });
  const calculate = action('Tính thử', 'submit');
  const sample = action('Thử số liệu mẫu');
  const local = action('Lấy từ sổ trên máy');
  const wait = action('Đưa vào danh sách chờ');
  wait.disabled = true;
  actions.append(calculate, sample, local, wait);
  form.append(actions);
  const output = el('div', null, { 'aria-live': 'polite' });
  root.append(status, form, output);
  let calculated = false;
  const invalidate = () => { calculated = false; wait.disabled = true; output.replaceChildren(); };
  form.addEventListener('input', invalidate);
  const fill = (a, b, d) => { balance.value = a; budget.value = b ?? ''; days.value = d; };
  sample.addEventListener('click', () => {
    invalidate();
    item.value = 'Tai nghe'; price.value = '400000'; reserved.value = '0';
    fill(1000000, 1000000, 10);
    say(status, 'Số liệu mẫu: 1.000.000đ cho 10 ngày, dự kiến mua tai nghe 400.000đ.');
    form.requestSubmit();
  });
  local.addEventListener('click', async () => {
    local.disabled = true;
    try {
      const current = await getCSession();
      const [wallets, transactions, budgets] = await Promise.all(
        ['wallets', 'transactions', 'budgets'].map(name => readCRecords(name, current)),
      );
      if (!root.isConnected) return;
      if (!wallets.length) throw new Error('Chưa có ví trên thiết bị. Hãy chuẩn bị dữ liệu hoặc nhập giả định.');
      const overview = readLocalOverview(wallets, transactions, budgets, todayLocal());
      invalidate();
      fill(overview.balance, overview.remaining, overview.days);
      say(status, overview.remaining === null
        ? 'Đã lấy số dư trên thiết bị. Chưa có ngân sách tháng này, hãy nhập ngân sách giả định.'
        : 'Đã lấy số liệu tháng này trên thiết bị; có thể gồm giao dịch chưa đồng bộ.');
    } catch (error) {
      say(status, error.message + ' Vẫn có thể nhập số liệu để mô phỏng.', true);
    } finally { local.disabled = false; }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    if (!form.reportValidity()) return;
    try {
      const result = simulatePurchase({
        price_vnd: price.valueAsNumber, balance_vnd: balance.valueAsNumber,
        budget_remaining_vnd: budget.valueAsNumber, days_remaining: days.valueAsNumber,
        reserved_vnd: reserved.valueAsNumber,
      });
      const table = el('table', null, { class: 'c-table' });
      const head = table.createTHead().insertRow();
      for (const label of ['Chỉ số', 'Trước khi mua', 'Nếu mua']) head.append(el('th', label, { scope: 'col' }));
      const body = table.createTBody();
      for (const [label, key] of [['Số dư', 'balance'], ['Ngân sách còn', 'budget'], ['Tiền linh hoạt', 'flexible'], ['Mức chi mỗi ngày', 'daily']]) {
        const row = body.insertRow();
        row.append(el('th', label, { scope: 'row' }));
        row.insertCell().textContent = money(result[key + '_before_vnd']);
        row.insertCell().textContent = money(result[key + '_after_vnd']);
      }
      output.append(table, el('p', result.exceeds_available
        ? 'Khoản mua vượt mức khả dụng theo số liệu này.'
        : 'Kết quả dựa trên giả định đã nhập. Chưa có giao dịch nào được ghi.',
      { class: result.exceeds_available ? 'c-error' : 'c-muted' }));
      calculated = true;
      wait.disabled = false;
    } catch {
      output.append(el('p', 'Kiểm tra giá, số ngày và các giá trị tiền nguyên trước khi tính.', { class: 'c-error' }));
    }
  });
  wait.addEventListener('click', () => {
    if (calculated) openWishlist({ name: item.value.trim(), price_vnd: price.valueAsNumber });
  });
}
