import { t } from '../i18n.js';
import { simulatePurchase } from '../domain/finance.js';
import { getCSession, openWishlist, readCRecords, takeSimulationPreset } from './c-context.js';
import { action, describeSpendingCapacity, el, field, money, readLocalOverview, say, todayLocal } from './c-tools.js';

// Ba cách dùng: lấy số liệu thật từ sổ trên máy, dùng số liệu mẫu, hoặc tự nhập giả định.
// Màn này chỉ điền form khi người dùng bấm nút; không tự làm mới và không ghi giao dịch.
const getModeText = () => ({
  empty: t('sim_mode_empty'),
  ledger: t('sim_mode_ledger'),
  sample: t('sim_mode_sample'),
  manual: t('sim_mode_manual'),
});
const OLD_MODE = {
  empty: 'Chưa có số liệu. Tự nhập giả định, hoặc bấm “Lấy từ sổ trên máy”.',
  ledger: 'Đang dùng số liệu thật từ sổ trên máy.',
  sample: 'Đang dùng số liệu mẫu, không phải dữ liệu của bạn.',
  manual: 'Đang dùng số liệu giả định do bạn nhập.',
};

export function render(container) {
  const root = el('section', null, { class: 'card c-module' });
  container.replaceChildren(root);
  root.append(
    el('h2', t('sim_header_title')),
    el('p', t('sim_header_desc'), { class: 'section-desc' }),
  );
  const preset = takeSimulationPreset();
  const form = el('form', null, { class: 'form c-grid', novalidate: '' });
  const integer = { type: 'number', step: '1', inputmode: 'numeric', required: '' };
  const item = field(form, t('sim_item_label'), 'item', { maxlength: '120', placeholder: t('sim_item_placeholder'), value: preset?.item_name ?? '' });
  const price = field(form, t('sim_price_label'), 'price', { ...integer, min: '1', placeholder: '400000', value: preset?.price_vnd ?? '' });
  const balance = field(form, t('sim_balance_label'), 'balance', { ...integer, placeholder: t('sim_balance_placeholder') });
  const budget = field(form, t('sim_budget_label'), 'budget', { ...integer, placeholder: t('sim_budget_placeholder') });
  const days = field(form, t('sim_days_label'), 'days', { ...integer, min: '1', max: '366' });
  const reserved = field(form, t('sim_reserved_label'), 'reserved', { ...integer, min: '0', value: '0' });
  const numbers = [balance, budget, days, reserved];

  const actions = el('div', null, { class: 'c-actions' });
  const calculate = action(t('sim_btn_calc'), 'submit');
  const secondary = el('div', null, { class: 'c-actions-secondary' });
  const local = action(t('sim_btn_local'));
  const sample = action(t('sim_btn_sample'));
  secondary.append(local, sample);
  actions.append(calculate, secondary);
  form.append(actions);

  const mode = el('p', null, { class: 'c-mode', 'data-mode': 'empty' });
  const status = el('p', null, { role: 'status', class: 'c-status' });
  const source = el('p', null, { class: 'c-muted c-source' });
  const output = el('div', null, { 'aria-live': 'polite', class: 'c-output' });
  root.append(mode, form, status, source, output);

  let currentMode = 'empty';
  let filling = false;
  const setMode = next => {
    currentMode = next;
    mode.dataset.mode = next;
    mode.textContent = getModeText()[next];
    if (next !== 'ledger') source.textContent = '';
  };
  setMode('empty');
  say(status, preset ? 'Đã điền món từ danh sách chờ hoặc chatbot. Bổ sung số liệu rồi bấm “Tính thử”.' : '');

  const invalidate = () => output.replaceChildren();
  form.addEventListener('input', event => {
    invalidate();
    // Sửa tay một ô số liệu sau khi lấy sổ hoặc mẫu: chuyển sang giả định, không tự lấy lại sổ.
    if (!filling && numbers.includes(event.target) && currentMode !== 'manual') setMode('manual');
  });
  const fill = (a, b, d) => {
    filling = true;
    balance.value = a; budget.value = b ?? ''; days.value = d;
    filling = false;
  };

  sample.addEventListener('click', () => {
    invalidate();
    item.value = 'Tai nghe'; price.value = '400000'; reserved.value = '0';
    fill(1000000, 1000000, 10);
    setMode('sample');
    say(status, 'Số liệu mẫu: số dư 1.000.000đ, ngân sách còn 1.000.000đ cho 10 ngày, mua tai nghe 400.000đ.');
    form.requestSubmit();
  });

  local.addEventListener('click', async () => {
    local.disabled = true;
    say(status, 'Đang đọc sổ trên máy…');
    try {
      const current = await getCSession();
      // Đọc thẳng IndexedDB mỗi lần bấm: gồm cả khoản lưu offline chưa đồng bộ, không chờ sync.
      const [wallets, transactions, budgets] = await Promise.all(
        ['wallets', 'transactions', 'budgets'].map(name => readCRecords(name, current)),
      );
      if (!root.isConnected) return;
      if (!wallets.length) throw new Error('Chưa có ví trên thiết bị. Hãy thêm ví ở màn Thu chi hoặc nhập giả định.');
      const today = todayLocal();
      const overview = readLocalOverview(wallets, transactions, budgets, today);
      invalidate();
      fill(overview.balance, overview.remaining, overview.days);
      setMode('ledger');
      const [year, month] = overview.month.split('-');
      const monthLabel = `${Number(month)}/${year}`;
      const parts = [
        `Số dư: tất cả ${overview.wallet_count} ví trên máy = số dư ban đầu + thu − chi; chuyển giữa các ví không đổi tổng.`,
        overview.state === 'unset'
          ? `Ngân sách tháng ${monthLabel}: chưa đặt hạn mức, đã chi ${money(overview.spent)}.`
          : `Ngân sách tháng ${monthLabel}: hạn mức ${money(overview.limit)} − đã chi ${money(overview.spent)} = ${money(overview.remaining)}.`,
        overview.pending
          ? `Đã tính ${overview.pending} thay đổi chưa đồng bộ.`
          : 'Mọi thay đổi trên máy đã đồng bộ.',
        `Lấy lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`,
      ];
      source.textContent = parts.join(' ');
      if (overview.state === 'unset') {
        say(status, `Chưa đặt hạn mức tháng ${monthLabel}. Nhập ngân sách giả định, hoặc đặt hạn mức ở tab Ngân sách rồi lấy lại.`, true);
        budget.focus();
      } else if (overview.state === 'zero') {
        say(status, 'Ngân sách tháng này còn đúng 0đ.', true);
      } else if (overview.state === 'over') {
        say(status, `Đã vượt ngân sách tháng này ${money(-overview.remaining)}.`, true);
      } else {
        say(status, 'Đã lấy số liệu mới nhất trên máy. Bấm “Tính thử” để xem kết quả.');
      }
    } catch (error) {
      say(status, error.message + ' Vẫn có thể nhập số liệu giả định để mô phỏng.', true);
    } finally { local.disabled = false; }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    if (!form.reportValidity()) {
      say(status, 'Điền đủ giá món, số dư, ngân sách còn lại và số ngày (số nguyên).', true);
      return;
    }
    try {
      const result = simulatePurchase({
        price_vnd: price.valueAsNumber, balance_vnd: balance.valueAsNumber,
        budget_remaining_vnd: budget.valueAsNumber, days_remaining: days.valueAsNumber,
        reserved_vnd: reserved.valueAsNumber,
      });
      const wrap = el('div', null, { class: 'table-responsive' });
      const table = el('table', null, { class: 'pb-table c-table' });
      wrap.append(table);
      const head = table.createTHead().insertRow();
      for (const label of ['Chỉ số', 'Trước khi mua', 'Nếu mua']) head.append(el('th', label, { scope: 'col' }));
      const body = table.createTBody();
      for (const [label, key] of [['Số dư', 'balance'], ['Ngân sách còn', 'budget'], ['Tiền linh hoạt', 'flexible']]) {
        const row = body.insertRow();
        row.append(el('th', label, { scope: 'row' }));
        const before = row.insertCell(); before.textContent = money(result[key + '_before_vnd']);
        const after = row.insertCell(); after.textContent = money(result[key + '_after_vnd']);
        if (result[key + '_after_vnd'] < 0) after.classList.add('c-negative');
      }
      // Dòng cuối: mỗi cột tự chọn cách hiển thị theo tiền linh hoạt của cột đó.
      const capacity = body.insertRow();
      capacity.append(el('th', 'Khả năng chi tiêu', { scope: 'row' }));
      for (const side of ['before', 'after']) {
        const view = describeSpendingCapacity(result[`flexible_${side}_vnd`], result[`daily_${side}_vnd`]);
        const cell = capacity.insertCell();
        if (view.tone === 'ok') {
          // Giữ số tiền trên một dòng, cho phép xuống dòng trước "/ngày" trên màn hẹp.
          cell.append('Có thể chi khoảng ', el('span', view.daily, { class: 'c-nowrap' }), document.createElement('wbr'), '/ngày');
        } else {
          cell.textContent = view.text;
        }
        cell.classList.add('c-capacity');
        if (view.tone === 'short') cell.classList.add('c-negative');
        if (view.tone === 'zero') cell.classList.add('c-muted');
      }
      const basis = { ledger: 'số liệu sổ trên máy', sample: 'số liệu mẫu', manual: 'số liệu giả định bạn nhập', empty: 'số liệu bạn nhập' }[currentMode];
      const note = el('p', result.exceeds_available
        ? `Khoản mua vượt mức khả dụng theo ${basis}.`
        : `Kết quả theo ${basis}. Chưa có giao dịch nào được ghi.`,
      { class: result.exceeds_available ? 'c-error' : 'c-muted' });
      const wait = action('Đưa vào danh sách chờ');
      wait.addEventListener('click', () => openWishlist({ name: item.value.trim(), price_vnd: price.valueAsNumber }));
      const after = el('div', null, { class: 'c-actions-secondary' });
      after.append(wait);
      const legend = el('p', 'Ngân sách còn là phần hạn mức chưa dùng. Số dư là số tiền trong các ví theo sổ.', { class: 'c-muted c-table-note' });
      output.append(wrap, legend, note, after);
      say(status, '');
    } catch {
      say(status, 'Kiểm tra giá, số ngày và các giá trị tiền nguyên trước khi tính.', true);
    }
  });
}
