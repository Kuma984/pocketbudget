// Phần C: biến ý định đã phân loại thành câu trả lời. AI chỉ nhận diện câu hỏi; mọi con số do app tính
// bằng domain/finance.js trên dữ liệu sổ trong IndexedDB (gồm cả thay đổi chưa đồng bộ).
import { calculateTotalBalance, calculateWalletBalances, getMonthBudgetStatus, getMonthTotals, openingBalanceOf } from '../domain/finance.js';
import { categoryLabels, money, resolveMonth, todayLocal } from './c-tools.js';

const LEDGER_NOTE = 'Đây là số dư ghi trong sổ PocketBudget, không phải số dư lấy trực tiếp từ ngân hàng.';

// Các nút hỏi nhanh: chạy thẳng trên sổ, không cần gọi chatbot.
export const QUICK_ACTIONS = [
  { label: 'Xem số dư', message: 'Tôi còn bao nhiêu tiền?', intent: { intent: 'balance', wallet_scope: 'all', as_of: 'current' } },
  { label: 'Xem ngân sách còn lại', message: 'Ngân sách tháng này còn bao nhiêu?', intent: { intent: 'budget_remaining', period: 'this_month' } },
  { label: 'Xem tổng thu/chi', message: 'Tháng này tôi thu và chi bao nhiêu?', intent: { intent: 'cashflow_summary', period: 'this_month' } },
];

const SUGGESTIONS = [
  { label: 'Tôi còn bao nhiêu tiền?', intent: QUICK_ACTIONS[0].intent },
  { label: 'Tháng này tôi đã chi bao nhiêu?', intent: { intent: 'expense_summary', period: 'this_month' } },
  { label: 'Ngân sách tháng này còn bao nhiêu?', intent: QUICK_ACTIONS[1].intent },
];

/** Chuẩn hóa tên ví để so khớp: bỏ emoji, dấu, chữ "ví", khoảng trắng thừa. */
export function normalizeWalletName(name) {
  return String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/^\s*vi\s+/, ' ').replace(/\s+/g, ' ').trim();
}

/** Tìm ví theo tên người dùng gọi. Trả { matches: [...] } (0, 1 hoặc nhiều ví). */
export function matchWallets(name, wallets) {
  const query = normalizeWalletName(name);
  if (!query) return { matches: [] };
  const named = wallets.map(wallet => ({ wallet, key: normalizeWalletName(wallet.name) }));
  const exact = named.filter(row => row.key === query);
  if (exact.length) return { matches: exact.map(row => row.wallet) };
  return { matches: named.filter(row => row.key && (row.key.includes(query) || query.includes(row.key))).map(row => row.wallet) };
}

function monthLabel(month) {
  const [year, m] = month.split('-');
  return `tháng ${Number(m)}/${year}`;
}

function pendingCount(rows) {
  return rows.filter(row => row.sync_status && row.sync_status !== 'synced').length;
}

function footnotes(pending, now) {
  const notes = [];
  if (pending) notes.push(`Đã tính ${pending} thay đổi chưa đồng bộ trên máy này.`);
  notes.push(`Nguồn: sổ trên máy, tính lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`);
  return notes;
}

const walletAsk = (wallets, text) => ({
  kind: 'ask', lines: [text],
  choices: wallets.map(w => ({ label: w.name, message: `Ví ${w.name} còn bao nhiêu?`, intent: { intent: 'balance', wallet_scope: 'named', wallet_name: w.name, as_of: 'current' } })),
});

function answerBalance(intent, { wallets, transactions }, now) {
  if (intent.as_of === 'past') {
    return {
      kind: 'answer',
      lines: ['PocketBudget chưa tính được số dư tại một thời điểm trong quá khứ: sổ chỉ có số dư ban đầu của ví và các giao dịch đã ghi, nên không bảo đảm đúng cho mốc đó. Mình không thay bằng số dư hiện tại để tránh nhầm.'],
      choices: [{ label: 'Xem số dư hiện tại', message: 'Tôi còn bao nhiêu tiền?', intent: QUICK_ACTIONS[0].intent }],
    };
  }
  if (!wallets.length) {
    return { kind: 'answer', tone: 'empty', lines: ['Chưa có ví nào trên máy này, nên chưa có dữ liệu để tính số dư. Thêm ví ở tab Thu chi trước.'] };
  }
  const balances = calculateWalletBalances(wallets, transactions);
  if (intent.wallet_scope === 'unclear') return walletAsk(wallets, 'Bạn muốn xem số dư của ví nào?');
  if (intent.wallet_scope === 'named') {
    const { matches } = matchWallets(intent.wallet_name, wallets);
    if (!matches.length) return walletAsk(wallets, `Không tìm thấy ví “${intent.wallet_name}”. Bạn muốn xem ví nào?`);
    const sameName = new Set(matches.map(w => normalizeWalletName(w.name))).size === 1;
    if (matches.length > 1 && !sameName) return walletAsk(matches, `Có ${matches.length} ví gần giống “${intent.wallet_name}”. Bạn muốn xem ví nào?`);
    const walletTxs = transactions.filter(t => matches.some(w => t.wallet_id === w.id || t.destination_wallet_id === w.id));
    const lines = matches.length === 1
      ? [`Số dư theo sổ của ví ${matches[0].name}: ${money(balances.get(matches[0].id) ?? 0)}.`]
      : [`Có ${matches.length} ví cùng tên “${matches[0].name}”:`, ...matches.map((w, i) => `Ví thứ ${i + 1}: ${money(balances.get(w.id) ?? 0)}`)];
    if (matches.length === 1 && !walletTxs.length && openingBalanceOf(matches[0]) === 0) {
      lines.push('Ví này chưa có số dư ban đầu và chưa có giao dịch nào.');
    }
    return { kind: 'answer', lines, notes: [LEDGER_NOTE, ...footnotes(pendingCount([...matches, ...walletTxs]), now)] };
  }
  const total = calculateTotalBalance(wallets, transactions);
  const lines = [`Số dư theo sổ PocketBudget (tất cả ${wallets.length} ví): ${money(total)}.`];
  const breakdown = wallets.map(w => `${w.name}: ${money(balances.get(w.id) ?? 0)}`);
  if (!transactions.length && wallets.every(w => openingBalanceOf(w) === 0)) {
    lines.push('Các ví chưa có số dư ban đầu và chưa có giao dịch nào, nên số dư đang là 0 ₫.');
  }
  return { kind: 'answer', lines, breakdown, notes: [LEDGER_NOTE, ...footnotes(pendingCount([...wallets, ...transactions]), now)] };
}

function askPeriod(intent, what) {
  return {
    kind: 'ask', lines: [`Bạn muốn xem ${what} tháng nào?`],
    choices: [['Tháng này', 'this_month'], ['Tháng trước', 'last_month']].map(([label, period]) => ({ label, message: `${label}`, intent: { ...intent, period } })),
  };
}

function answerFlow(intent, { transactions }, today, now) {
  const type = intent.intent === 'income_summary' ? 'income' : 'expense';
  const word = type === 'income' ? 'thu' : 'chi';
  if (!intent.period) return askPeriod(intent, `tổng ${word}`);
  const month = resolveMonth(intent.period, today);
  const rows = transactions.filter(t => t.type === type && t.occurred_on?.slice(0, 7) === month
    && (!intent.category_code || t.category_code === intent.category_code));
  const total = getMonthTotals(rows, month)[type === 'income' ? 'income_vnd' : 'expense_vnd'];
  const scope = intent.category_code ? ` (${categoryLabels[intent.category_code]})` : '';
  const lines = rows.length
    ? [`Tổng ${word} ${monthLabel(month)}${scope}: ${money(total)}, từ ${rows.length} giao dịch.`]
    : [`Chưa ghi khoản ${word} nào trong ${monthLabel(month)}${scope}, nên tổng ${word} là 0 ₫.`];
  return { kind: 'answer', lines, notes: footnotes(pendingCount(rows), now) };
}

function answerCashflow(intent, { transactions }, today, now) {
  const month = resolveMonth(intent.period ?? 'this_month', today);
  const totals = getMonthTotals(transactions, month);
  const rows = transactions.filter(t => t.occurred_on?.slice(0, 7) === month && t.type !== 'transfer');
  return {
    kind: 'answer',
    lines: [`Trong ${monthLabel(month)}: thu ${money(totals.income_vnd)}, chi ${money(totals.expense_vnd)}.`],
    breakdown: [`Chênh lệch thu − chi: ${money(totals.net_vnd)}`, 'Chuyển giữa các ví không tính là thu hay chi.'],
    notes: footnotes(pendingCount(rows), now),
  };
}

function answerBudget(intent, { budgets, transactions }, today, now) {
  const month = resolveMonth(intent.period ?? 'this_month', today);
  const status = getMonthBudgetStatus(budgets, transactions, month);
  const label = monthLabel(month);
  const pending = pendingCount([...budgets.filter(b => b.month === month), ...transactions.filter(t => t.occurred_on?.slice(0, 7) === month)]);
  let lines;
  if (status.state === 'unset') {
    lines = [`Chưa đặt hạn mức ngân sách ${label}, nên chưa có ngân sách còn lại. Đã chi ${money(status.spent_vnd)}.`, 'Đặt hạn mức ở tab Ngân sách hoặc nút “Đặt Ngân Sách”.'];
  } else if (status.state === 'zero') {
    lines = [`Ngân sách ${label} còn đúng 0 ₫: đã dùng hết hạn mức ${money(status.limit_vnd)}.`];
  } else if (status.state === 'over') {
    lines = [`Đã vượt ngân sách ${label}: thiếu ${money(-status.remaining_vnd)}.`, `Hạn mức ${money(status.limit_vnd)}, đã chi ${money(status.spent_vnd)}.`];
  } else {
    lines = [`Ngân sách còn lại ${label}: ${money(status.remaining_vnd)}.`, `Hạn mức ${money(status.limit_vnd)} − đã chi ${money(status.spent_vnd)}.`];
  }
  return { kind: 'answer', tone: status.state === 'over' ? 'warn' : undefined, lines, notes: footnotes(pending, now) };
}

/**
 * Trả lời một ý định truy vấn từ dữ liệu sổ. data = { wallets, transactions, budgets } của đúng tài khoản.
 * Ý định khác (mô phỏng, bản nháp) do chat.js xử lý vì cần giao diện riêng.
 */
export function answerIntent(intent, data, today = todayLocal(), now = new Date()) {
  const clean = {
    wallets: data.wallets.filter(row => !row.deleted_at),
    transactions: data.transactions.filter(row => !row.deleted_at),
    budgets: data.budgets.filter(row => !row.deleted_at),
  };
  try {
    switch (intent.intent) {
      case 'balance': return answerBalance(intent, clean, now);
      case 'expense_summary':
      case 'income_summary': return answerFlow(intent, clean, today, now);
      case 'cashflow_summary': return answerCashflow(intent, clean, today, now);
      case 'budget_remaining': return answerBudget(intent, clean, today, now);
      case 'clarify_remaining':
        return {
          kind: 'ask', lines: ['Bạn muốn xem số dư trong ví hay ngân sách còn lại?'],
          choices: [
            { label: 'Số dư trong ví', message: 'Số dư trong ví', intent: QUICK_ACTIONS[0].intent },
            { label: 'Ngân sách còn lại', message: 'Ngân sách còn lại', intent: QUICK_ACTIONS[1].intent },
          ],
        };
      default:
        return unsupportedAnswer();
    }
  } catch {
    return { kind: 'error', lines: ['Có giao dịch, ví hoặc hạn mức không hợp lệ trong sổ trên máy nên chưa tính được. Kiểm tra lại ở tab Thu chi.'] };
  }
}

export function unsupportedAnswer() {
  return {
    kind: 'answer', tone: 'muted',
    lines: ['Mình chưa hỗ trợ câu hỏi này. Mình trả lời được về số dư theo sổ, tổng thu/chi, ngân sách còn lại, mô phỏng khoản mua và tạo bản nháp giao dịch. Thử một câu dưới đây:'],
    choices: SUGGESTIONS.map(s => ({ ...s, message: s.label })),
  };
}

/** Kết quả gửi lại cho server làm ngữ cảnh: chỉ ý định hợp lệ phía server, không có số tiền. */
export function historyResult(intent) {
  if (intent.intent === 'cashflow_summary') return { intent: 'expense_summary', period: intent.period ?? 'this_month' };
  const { missing_fields: _ignored, ...rest } = intent;
  if (rest.intent === 'draft_transaction' && rest.draft) rest.draft = { ...rest.draft };
  return rest;
}
