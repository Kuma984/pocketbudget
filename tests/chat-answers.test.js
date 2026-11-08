import test from 'node:test';
import assert from 'node:assert/strict';
import { answerIntent, historyResult, matchWallets, normalizeWalletName } from '../public/js/modules/chat-answers.js';

const today = '2026-11-08';
const now = new Date('2026-11-08T08:00:00Z');
const plain = s => s.replace(/\s/g, ' ');
const text = answer => plain([...answer.lines, ...(answer.breakdown ?? []), ...(answer.notes ?? [])].join(' | '));
// Số dư 1.600.000 (gồm khoản chi tháng trước) ≠ tổng chi tháng 500.000 ≠ ngân sách còn 2.500.000.
const data = () => ({
  wallets: [
    { id: 'cash', name: '💵 Tiền mặt', opening_balance_vnd: 1200000, sync_status: 'synced' },
    { id: 'bank', name: '🏦 Ngân hàng', opening_balance_vnd: 800000, sync_status: 'synced' },
  ],
  transactions: [
    { id: 't1', type: 'expense', amount_vnd: 500000, wallet_id: 'cash', category_code: 'food', occurred_on: '2026-11-08', sync_status: 'pending' },
    { id: 't2', type: 'income', amount_vnd: 300000, wallet_id: 'bank', category_code: 'allowance', occurred_on: '2026-11-02', sync_status: 'synced' },
    { id: 't3', type: 'transfer', amount_vnd: 100000, wallet_id: 'bank', destination_wallet_id: 'cash', occurred_on: '2026-11-03', sync_status: 'synced' },
    { id: 't0', type: 'expense', amount_vnd: 200000, wallet_id: 'cash', category_code: 'transport', occurred_on: '2026-10-20', sync_status: 'synced' },
  ],
  budgets: [{ id: 'b1', month: '2026-11', limit_vnd: 3000000, sync_status: 'synced' }],
});
const ask = (intent, d = data()) => answerIntent(intent, d, today, now);

test('ý định số dư trả số dư theo sổ, không phải tổng chi hay ngân sách', () => {
  // Đây là kết quả đúng mà model phải trả cho "tháng này tôi đang có bao nhiêu tiền trong tài khoản".
  const t = text(ask({ intent: 'balance', wallet_scope: 'all', as_of: 'current' }));
  assert.match(t, /Số dư theo sổ PocketBudget \(tất cả 2 ví\): 1\.600\.000 ₫/);
  assert.doesNotMatch(t, /giao dịch chi|500\.000 ₫\.|2\.500\.000/);
  assert.match(t, /không phải số dư lấy trực tiếp từ ngân hàng/);
  assert.match(t, /Đã tính 1 thay đổi chưa đồng bộ/);
});

test('tổng chi, tổng thu và ngân sách còn lại là ba câu trả lời khác nhau', () => {
  assert.match(text(ask({ intent: 'expense_summary', period: 'this_month' })), /Tổng chi tháng 11\/2026: 500\.000 ₫, từ 1 giao dịch/);
  assert.match(text(ask({ intent: 'income_summary', period: 'this_month' })), /Tổng thu tháng 11\/2026: 300\.000 ₫/);
  assert.match(text(ask({ intent: 'budget_remaining', period: 'this_month' })), /Ngân sách còn lại tháng 11\/2026: 2\.500\.000 ₫.*Hạn mức 3\.000\.000 ₫ − đã chi 500\.000 ₫/);
  assert.match(text(ask({ intent: 'cashflow_summary', period: 'this_month' })), /thu 300\.000 ₫, chi 500\.000 ₫/);
});

test('hỏi theo ví: khớp tên bỏ emoji/dấu/chữ "ví"; không xác định được thì hỏi lại tên ví', () => {
  assert.equal(normalizeWalletName('💵 Tiền mặt'), 'tien mat');
  assert.equal(normalizeWalletName('Ví MoMo'), 'momo');
  assert.match(text(ask({ intent: 'balance', wallet_scope: 'named', wallet_name: 'Tiền mặt' })), /ví 💵 Tiền mặt: 600\.000 ₫/);
  assert.match(text(ask({ intent: 'balance', wallet_scope: 'named', wallet_name: 'ngan hang' })), /ví 🏦 Ngân hàng: 1\.000\.000 ₫/);
  const missing = ask({ intent: 'balance', wallet_scope: 'named', wallet_name: 'MoMo' });
  assert.equal(missing.kind, 'ask');
  assert.match(missing.lines[0], /Không tìm thấy ví “MoMo”/);
  assert.deepEqual(missing.choices.map(c => c.label), ['💵 Tiền mặt', '🏦 Ngân hàng']);
  const unclear = ask({ intent: 'balance', wallet_scope: 'unclear' });
  assert.equal(unclear.kind, 'ask');
  assert.match(unclear.lines[0], /ví nào/);
});

test('hai ví trùng tên: liệt kê cả hai thay vì cộng gộp hay chọn bừa', () => {
  const d = data();
  d.wallets.push({ id: 'cash2', name: '💵 Tiền mặt', opening_balance_vnd: 50000 });
  const t = text(ask({ intent: 'balance', wallet_scope: 'named', wallet_name: 'tiền mặt' }, d));
  assert.match(t, /Có 2 ví cùng tên/);
  assert.match(t, /Ví thứ 2: 50\.000 ₫/);
  assert.equal(matchWallets('xyz', d.wallets).matches.length, 0);
});

test('số dư 0 khác với chưa có dữ liệu', () => {
  const empty = ask({ intent: 'balance', wallet_scope: 'all', as_of: 'current' }, { wallets: [], transactions: [], budgets: [] });
  assert.equal(empty.tone, 'empty');
  assert.match(empty.lines[0], /Chưa có ví nào/);
  const zero = text(ask({ intent: 'balance', wallet_scope: 'all' }, { wallets: [{ id: 'w', name: 'Tiền mặt', opening_balance_vnd: 0 }], transactions: [], budgets: [] }));
  assert.match(zero, /: 0 ₫\./);
  assert.match(zero, /chưa có số dư ban đầu và chưa có giao dịch/);
  // Có giao dịch nhưng tổng đúng bằng 0: chỉ báo 0 ₫, không nói "chưa có giao dịch".
  const exact = text(ask({ intent: 'balance', wallet_scope: 'all' }, { wallets: [{ id: 'w', name: 'Tiền mặt', opening_balance_vnd: 100000 }],
    transactions: [{ id: 'x', type: 'expense', amount_vnd: 100000, wallet_id: 'w', category_code: 'food', occurred_on: today }], budgets: [] }));
  assert.match(exact, /: 0 ₫\./);
  assert.doesNotMatch(exact, /chưa có giao dịch/);
});

test('hỏi số dư quá khứ: báo không tính được, không trả số dư hiện tại', () => {
  const past = ask({ intent: 'balance', wallet_scope: 'all', as_of: 'past' });
  assert.match(past.lines[0], /chưa tính được số dư tại một thời điểm trong quá khứ/);
  assert.doesNotMatch(text(past), /1\.600\.000/);
  assert.equal(past.choices[0].intent.as_of, 'current');
});

test('ngân sách: chưa đặt, còn đúng 0đ, vượt; kỳ trước dùng hạn mức của kỳ đó', () => {
  const d = data();
  d.budgets = [];
  assert.match(text(ask({ intent: 'budget_remaining', period: 'this_month' }, d)), /Chưa đặt hạn mức ngân sách tháng 11\/2026.*Đã chi 500\.000 ₫/);
  d.budgets = [{ month: '2026-11', limit_vnd: 500000 }];
  assert.match(text(ask({ intent: 'budget_remaining' }, d)), /còn đúng 0 ₫/);
  d.budgets = [{ month: '2026-11', limit_vnd: 300000 }];
  const over = ask({ intent: 'budget_remaining' }, d);
  assert.equal(over.tone, 'warn');
  assert.match(text(over), /Đã vượt ngân sách tháng 11\/2026: thiếu 200\.000 ₫/);
  assert.match(text(ask({ intent: 'budget_remaining', period: 'last_month' })), /Chưa đặt hạn mức ngân sách tháng 10\/2026.*Đã chi 200\.000 ₫/);
});

test('câu nối tiếp đổi kỳ / danh mục; thiếu kỳ thì hỏi lại; chưa có khoản chi thì báo 0 ₫', () => {
  assert.match(text(ask({ intent: 'expense_summary', period: 'last_month' })), /Tổng chi tháng 10\/2026: 200\.000 ₫/);
  assert.match(text(ask({ intent: 'expense_summary', period: 'last_month', category_code: 'food' })), /Chưa ghi khoản chi nào trong tháng 10\/2026 \(Ăn uống\), nên tổng chi là 0 ₫/);
  const noPeriod = ask({ intent: 'expense_summary', category_code: 'food' });
  assert.equal(noPeriod.kind, 'ask');
  assert.deepEqual(noPeriod.choices.map(c => c.intent), [
    { intent: 'expense_summary', category_code: 'food', period: 'this_month' },
    { intent: 'expense_summary', category_code: 'food', period: 'last_month' },
  ]);
});

test('câu mơ hồ hỏi lại; câu ngoài phạm vi không tự chuyển sang tổng chi', () => {
  const clarify = ask({ intent: 'clarify_remaining' });
  assert.equal(clarify.lines[0], 'Bạn muốn xem số dư trong ví hay ngân sách còn lại?');
  assert.deepEqual(clarify.choices.map(c => c.intent.intent), ['balance', 'budget_remaining']);
  const unsupported = ask({ intent: 'unsupported' });
  assert.match(unsupported.lines[0], /chưa hỗ trợ câu hỏi này/);
  assert.doesNotMatch(text(unsupported), /500\.000/);
});

test('dữ liệu hỏng báo lỗi rõ thay vì trả số sai', () => {
  const d = data();
  d.transactions.push({ id: 'bad', type: 'expense', amount_vnd: 1.5, occurred_on: today });
  assert.equal(ask({ intent: 'expense_summary', period: 'this_month' }, d).kind, 'error');
});

test('ngữ cảnh gửi server chỉ gồm ý định hợp lệ, không có số liệu sổ', () => {
  assert.deepEqual(historyResult({ intent: 'cashflow_summary', period: 'this_month' }), { intent: 'expense_summary', period: 'this_month' });
  assert.deepEqual(historyResult({ intent: 'draft_transaction', draft: { type: 'expense' }, missing_fields: ['wallet_id'] }),
    { intent: 'draft_transaction', draft: { type: 'expense' } });
});
