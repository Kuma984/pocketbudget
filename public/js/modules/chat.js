import { apiRequest } from '../api.js';
import { isValidAmount } from '../domain/finance.js';
import { currentAppUserId, getCSession, openSimulation, readCRecords } from './c-context.js';
import { renderDraft } from './c-draft.js';
import { action, el, field, money, todayLocal } from './c-tools.js';
import { QUICK_ACTIONS, answerIntent, historyResult, unsupportedAnswer } from './chat-answers.js';

// Câu mẫu hiển thị cho người dùng (không phải system prompt). Bấm để điền vào ô chat.
const EXAMPLES = [
  ['Hỏi số dư', 'Tôi còn bao nhiêu tiền?'],
  ['Hỏi tổng chi', 'Tháng này chi ăn uống bao nhiêu?'],
  ['Mô phỏng khoản mua', 'Mô phỏng mua tai nghe 400k.'],
  ['Tạo bản nháp', 'Tạo bản nháp chi 45k ăn trưa hôm nay.'],
];
const QUERY_INTENTS = ['balance', 'expense_summary', 'income_summary', 'budget_remaining', 'clarify_remaining'];
const MAX_TURNS = 3;

// Hội thoại chỉ sống trong bộ nhớ của tab, gắn với user đang dùng. Đăng xuất hoặc đổi tài khoản thì bỏ.
let chat = null;
function newChat(owner) {
  return { owner, log: el('div', null, { class: 'c-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Cuộc trò chuyện' }), turns: [], draft: '' };
}
function chatState() {
  const owner = currentAppUserId();
  if (!chat || chat.owner !== owner) chat = newChat(owner);
  return chat;
}

export function render(container) {
  const state = chatState();
  const root = el('section', null, { class: 'card c-module' });
  container.replaceChildren(root);
  root.append(el('h2', 'Trợ lý AI'),
    el('p', 'Hỏi về số dư, thu chi, ngân sách, thử một khoản mua hoặc tạo bản nháp. Chatbot chạy local qua máy chủ của nhóm và không tự lưu giao dịch.', { class: 'section-desc' }),
    state.log);

  const form = el('form', null, { class: 'form c-chat-form' });
  const message = field(form, 'Câu hỏi của bạn', 'chat-message', { tag: 'textarea', maxlength: '500', rows: '2', placeholder: 'Ví dụ: Tôi còn bao nhiêu tiền?', enterkeyhint: 'send' });
  message.value = state.draft;
  message.addEventListener('input', () => { state.draft = message.value; });

  const guide = el('details', null, { class: 'c-guide' });
  if (!state.log.childElementCount) guide.open = true;
  guide.append(el('summary', 'Cách dùng chatbot'));
  const sampleList = el('ul', null, { class: 'c-guide-samples' });
  for (const [label, example] of EXAMPLES) {
    const button = el('button', null, { type: 'button', class: 'c-sample', title: 'Điền câu này vào ô chat' });
    button.append(el('span', label, { class: 'c-sample-label' }), el('span', '“' + example + '”', { class: 'c-sample-text' }));
    button.addEventListener('click', () => { message.value = example; state.draft = example; message.focus(); });
    const li = el('li'); li.append(button); sampleList.append(li);
  }
  const rules = el('ul', null, { class: 'c-guide-rules' });
  for (const rule of [
    'Mỗi lần hỏi một việc. Có thể hỏi nối tiếp, ví dụ “Còn ví Tiền mặt?” hoặc “Còn tháng trước?”.',
    'Kiểm tra số tiền, ngày và ví trước khi xác nhận. Bot không tự lưu giao dịch.',
    'Không nhập mật khẩu, OTP hoặc số thẻ. Nếu không kết nối được chatbot, vẫn dùng Thu chi và Mô phỏng thủ công được.',
  ]) rules.append(el('li', rule));
  guide.append(sampleList, el('p', 'Bấm vào một câu mẫu để điền vào ô chat. Enter để gửi, Shift + Enter để xuống dòng.', { class: 'c-muted c-guide-hint' }), rules);

  const quick = el('div', null, { class: 'c-quick', role: 'group', 'aria-label': 'Hỏi nhanh' });
  for (const item of QUICK_ACTIONS) {
    const button = el('button', item.label, { type: 'button', class: 'c-chip' });
    button.addEventListener('click', () => void runLocal(item.message, item.intent));
    quick.append(button);
  }

  const actions = el('div', null, { class: 'c-actions' });
  const submit = action('Gửi câu hỏi', 'submit');
  const secondary = el('div', null, { class: 'c-actions-secondary' });
  const reset = action('Cuộc trò chuyện mới');
  const manual = action('Mở mô phỏng thủ công');
  reset.addEventListener('click', () => {
    if (busy) return;
    chat = newChat(currentAppUserId());
    render(container);
  });
  manual.addEventListener('click', () => openSimulation(null));
  secondary.append(reset, manual);
  actions.append(submit, secondary);
  form.append(actions);
  root.append(guide, quick, form);

  let busy = false;
  const setBusy = value => {
    busy = value;
    submit.disabled = value;
    submit.textContent = value ? 'Đang trả lời…' : 'Gửi câu hỏi';
    for (const button of quick.querySelectorAll('button')) button.disabled = value;
  };
  const scrollToEnd = node => {
    state.log.scrollTop = state.log.scrollHeight;
    node?.scrollIntoView?.({ block: 'nearest' });
  };
  function bubble(role, ...children) {
    const node = el('div', null, { class: `c-msg c-msg-${role}` });
    node.append(...children);
    state.log.append(node);
    if (state.log.childElementCount) guide.open = false;
    scrollToEnd(node);
    return node;
  }
  const userBubble = text => bubble('user', el('p', text));
  const typingBubble = () => bubble('bot', el('p', 'Đang trả lời…', { class: 'c-typing' }));
  const remember = (text, intent) => {
    state.turns.push({ message: text.slice(0, 500), result: historyResult(intent) });
    state.turns = state.turns.slice(-MAX_TURNS);
  };

  function fillAnswer(node, answer) {
    node.replaceChildren();
    node.classList.toggle('c-msg-error', answer.kind === 'error');
    node.classList.toggle('c-msg-warn', answer.tone === 'warn');
    for (const line of answer.lines) node.append(el('p', line));
    if (answer.breakdown?.length) {
      const list = el('ul', null, { class: 'c-msg-list' });
      for (const line of answer.breakdown) list.append(el('li', line));
      node.append(list);
    }
    for (const note of answer.notes ?? []) node.append(el('p', note, { class: 'c-msg-note' }));
    if (answer.choices?.length) {
      const row = el('div', null, { class: 'c-quick' });
      for (const choice of answer.choices) {
        const button = el('button', choice.label, { type: 'button', class: 'c-chip' });
        button.addEventListener('click', () => void runLocal(choice.message, choice.intent));
        row.append(button);
      }
      node.append(row);
    }
    scrollToEnd(node);
  }

  // Máy chủ báo tài khoản khác với chủ hội thoại: bỏ hội thoại cũ, không gửi ngữ cảnh của người trước.
  function switchedAccount(current, pendingQuestion) {
    if (state.owner === current.user.id) return false;
    chat = newChat(current.user.id);
    chat.draft = pendingQuestion;
    render(container);
    return true;
  }

  async function readLedger(current) {
    const [wallets, transactions, budgets] = await Promise.all(['wallets', 'transactions', 'budgets'].map(name => readCRecords(name, current)));
    return { wallets, transactions, budgets };
  }

  // Câu trả lời tính thẳng trên sổ (nút hỏi nhanh, lựa chọn trong câu hỏi lại): không cần gọi chatbot.
  async function runLocal(text, intent) {
    if (busy || chatState() !== state) return;
    setBusy(true);
    userBubble(text);
    const reply = typingBubble();
    try {
      const current = await getCSession();
      if (switchedAccount(current, '')) return;
      const answer = answerIntent(intent, await readLedger(current), todayLocal());
      fillAnswer(reply, answer);
      if (answer.kind !== 'error') remember(text, intent);
    } catch (error) {
      fillAnswer(reply, { kind: 'error', lines: [error.message] });
    } finally { setBusy(false); }
  }

  async function ask(question, { retry = false } = {}) {
    if (busy) return;
    if (chatState() !== state) { render(container); return; }
    setBusy(true);
    if (!retry) {
      userBubble(question);
      message.value = ''; state.draft = '';
    }
    const reply = typingBubble();
    try {
      if (navigator.onLine === false) {
        throw new Error('Thiết bị đang offline nên không gọi được chatbot. Các nút hỏi nhanh vẫn tính được trên sổ trong máy.');
      }
      const current = await getCSession();
      if (switchedAccount(current, question)) return;
      if (!current.csrf_token) throw new Error('Phiên đăng nhập chưa có mã bảo mật. Tải lại trang hoặc đăng nhập lại.');
      const now = new Date();
      const today = todayLocal(now);
      const response = await apiRequest('chat.php', {
        method: 'POST', csrfToken: current.csrf_token,
        body: { message: question, context: { today, as_of: now.toISOString(), history: state.turns } },
      });
      const intent = response?.intent;
      if (QUERY_INTENTS.includes(intent)) {
        const answer = answerIntent(response, await readLedger(current), today);
        fillAnswer(reply, answer);
        if (answer.kind !== 'error') remember(question, response);
      } else if (intent === 'simulate_purchase') {
        remember(question, response);
        if (!isValidAmount(response.price_vnd)) {
          fillAnswer(reply, { kind: 'ask', lines: ['Món này giá bao nhiêu? Ghi rõ giá, ví dụ “Mô phỏng mua tai nghe 400k”.'] });
        } else {
          reply.replaceChildren(el('p', `${response.item_name || 'Khoản mua'}: ${money(response.price_vnd)}. Mở Mô phỏng để xem số dư và ngân sách thay đổi thế nào. Chưa có giao dịch nào được ghi.`));
          const open = action('Mở mô phỏng với giá này');
          open.addEventListener('click', () => openSimulation({ item_name: response.item_name, price_vnd: response.price_vnd }));
          reply.append(open);
          scrollToEnd(reply);
        }
      } else if (intent === 'draft_transaction' && response.draft && typeof response.draft === 'object') {
        remember(question, response);
        reply.replaceChildren(el('p', 'Đã tạo bản nháp. Kiểm tra số tiền, ngày và ví rồi bấm xác nhận; bản nháp chưa được ghi vào sổ.'));
        const area = el('div');
        reply.append(area);
        await renderDraft(area, { current, draft: response.draft });
        scrollToEnd(reply);
      } else if (intent === 'unsupported') {
        fillAnswer(reply, unsupportedAnswer());
      } else {
        throw new Error('Chatbot trả dữ liệu không hợp lệ. Hãy thử câu ngắn hơn.');
      }
    } catch (error) {
      const text = error instanceof TypeError
        ? 'Không kết nối được máy chủ PocketBudget. Kiểm tra máy chủ rồi thử lại; Thu chi và Mô phỏng thủ công vẫn dùng được.'
        : error.message;
      fillAnswer(reply, { kind: 'error', lines: [text] });
      // Giữ câu hỏi để thử lại: nút "Thử lại" và điền lại vào ô chat nếu ô đang trống.
      const retryButton = action('Thử lại');
      retryButton.addEventListener('click', () => { retryButton.remove(); void ask(question, { retry: true }); });
      const row = el('div', null, { class: 'c-quick' });
      const fallback = action('Mở mô phỏng thủ công');
      fallback.addEventListener('click', () => openSimulation(null));
      row.append(retryButton, fallback);
      reply.append(row);
      if (!message.value.trim()) { message.value = question; state.draft = question; }
      scrollToEnd(reply);
    } finally { setBusy(false); }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const question = message.value.trim();
    if (!question) { message.focus(); return; }
    void ask(question);
  });
  message.addEventListener('keydown', event => {
    // Không gửi khi bộ gõ (IME) đang ghép chữ tiếng Việt; Shift+Enter để xuống dòng.
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (!busy) form.requestSubmit();
  });
  scrollToEnd();
}
