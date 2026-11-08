import { apiRequest } from '../api.js';
import { getCSession, openSimulation, readCRecords } from './c-context.js';
import { renderDraft } from './c-draft.js';
import { action, categoryLabels, el, expenseSummary, field, money, say, todayLocal } from './c-tools.js';
import { isValidAmount } from '../domain/finance.js';

// Câu mẫu hiển thị cho người dùng (không phải system prompt). Bấm để điền vào ô chat.
const examples = [
  ['Hỏi tổng chi', 'Tháng này chi ăn uống bao nhiêu?'],
  ['Mô phỏng khoản mua', 'Mô phỏng mua tai nghe 400k.'],
  ['Tạo bản nháp', 'Tạo bản nháp chi 45k ăn trưa hôm nay.'],
];

export function render(container) {
  const root = el('section', null, { class: 'card c-module' });
  container.replaceChildren(root);
  const status = el('p', 'Cần đăng nhập và kết nối tới máy chạy Ollama.', { role: 'status', class: 'c-status' });
  const form = el('form', null, { class: 'form' });
  const message = field(form, 'Câu hỏi của bạn', 'chat-message', { tag: 'textarea', required: '', maxlength: '500', rows: '3', placeholder: 'Ví dụ: Tháng này chi ăn uống bao nhiêu?' });
  const actions = el('div', null, { class: 'c-actions' });
  const submit = action('Gửi câu hỏi', 'submit');
  const fallback = action('Mở mô phỏng thủ công');
  fallback.addEventListener('click', () => openSimulation(null));
  const secondary = el('div', null, { class: 'c-actions-secondary' });
  secondary.append(fallback);
  actions.append(submit, secondary);
  form.append(actions);

  const guide = el('section', null, { class: 'c-guide', 'aria-labelledby': 'c-guide-title' });
  guide.append(el('h3', 'Cách dùng chatbot', { id: 'c-guide-title' }));
  const sampleList = el('ul', null, { class: 'c-guide-samples' });
  for (const [label, example] of examples) {
    const li = el('li');
    const button = el('button', null, { type: 'button', class: 'c-sample', title: 'Điền câu này vào ô chat' });
    button.append(el('span', label, { class: 'c-sample-label' }), el('span', '“' + example + '”', { class: 'c-sample-text' }));
    button.addEventListener('click', () => { message.value = example; message.focus(); });
    li.append(button);
    sampleList.append(li);
  }
  const rules = el('ul', null, { class: 'c-guide-rules' });
  for (const rule of [
    'Mỗi lần hỏi một việc. Kiểm tra số tiền, ngày và ví trước khi xác nhận. Bot không tự lưu giao dịch.',
    'Không nhập mật khẩu, OTP hoặc số thẻ. Nếu không kết nối được chatbot, vẫn dùng Thu chi và Mô phỏng thủ công được.',
  ]) rules.append(el('li', rule));
  guide.append(sampleList, el('p', 'Bấm vào một câu mẫu để điền vào ô chat.', { class: 'c-muted c-guide-hint' }), rules);

  const output = el('section', null, { class: 'c-chat-result', 'aria-live': 'polite' });
  root.append(el('h2', 'Trợ lý AI'), el('p', 'Hỏi về chi tiêu, thử một khoản mua hoặc tạo bản nháp. Chatbot chạy local qua máy chủ của nhóm.', { class: 'section-desc' }), guide, form, status, output);
  let busy = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity() || !message.value.trim()) return;
    if (navigator.onLine === false) {
      say(status, 'Thiết bị đang offline và không gọi được chatbot. Bạn vẫn có thể mô phỏng thủ công.', true);
      return;
    }
    const question = message.value.trim();
    busy = true; submit.disabled = true; output.replaceChildren();
    say(status, 'Đang gửi tới chatbot local…');
    try {
      const current = await getCSession();
      if (!current.csrf_token) throw new Error('API đăng nhập chưa trả mã CSRF. Cần ghép phần A.');
      const now = new Date();
      const today = todayLocal(now);
      const response = await apiRequest('chat.php', {
        method: 'POST', csrfToken: current.csrf_token,
        body: { message: question, context: { today, as_of: now.toISOString() } },
      });
      if (!root.isConnected) return;
      if (response?.intent === 'unsupported') {
        say(status, 'Chưa hiểu yêu cầu này. Thử hỏi tổng chi, mô phỏng khoản mua hoặc tạo bản nháp.');
      } else if (response?.intent === 'expense_summary') {
        if (!response.period) {
          say(status, 'Bạn muốn xem chi tiêu tháng nào? Ví dụ: tháng này hoặc tháng 10/2026.');
          return;
        }
        const rows = await readCRecords('transactions', current);
        const summary = expenseSummary(rows, response.period, response.category_code ?? null, today);
        const label = response.category_code ? categoryLabels[response.category_code] : 'Tất cả danh mục';
        const pending = rows.filter(row => row.sync_status === 'pending').length;
        output.append(el('h3', label + ' · ' + summary.month),
          el('p', summary.count + ' giao dịch chi đã ghi nhận, tổng ' + money(summary.total) + '.'),
          el('p', 'Nguồn: sổ trên thiết bị · Tính lúc ' + new Date().toLocaleString('vi-VN') +
            ' · Giao dịch đang chờ đồng bộ trong sổ: ' + pending + '.', { class: 'c-muted' }));
        say(status, 'Chatbot nhận diện câu hỏi; số tiền do app tính.');
      } else if (response?.intent === 'simulate_purchase') {
        if (!isValidAmount(response.price_vnd)) { say(status, 'Món này giá bao nhiêu? Thử ghi rõ giá bằng VND.'); return; }
        output.append(el('p', (response.item_name || 'Khoản mua') + ' · ' + money(response.price_vnd)));
        const preview = action('Mở mô phỏng với giá này');
        preview.addEventListener('click', () => openSimulation({ item_name: response.item_name, price_vnd: response.price_vnd }));
        output.append(preview);
        say(status, 'Đã nhận diện khoản mua. Chưa có giao dịch nào được ghi.');
      } else if (response?.intent === 'draft_transaction' && response.draft && typeof response.draft === 'object') {
        say(status, 'Đã tạo bản nháp. Bổ sung trường còn thiếu và kiểm tra trước khi lưu.');
        await renderDraft(output, { current, draft: response.draft });
      } else throw new Error('Chatbot trả dữ liệu không hợp lệ. Hãy thử câu ngắn hơn.');
    } catch (error) {
      say(status, error instanceof TypeError ? 'Không gọi được máy chủ. Nhập liệu và mô phỏng thủ công vẫn dùng được.' : error.message, true);
    } finally { busy = false; submit.disabled = false; }
  });
}
