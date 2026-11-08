import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotalBalance, calculateWalletBalances, dailyAllowance, getMonthBudgetStatus } from '../public/js/domain/finance.js';
import { readLocalOverview } from '../public/js/modules/c-tools.js';

const today = '2026-11-08';
const month = '2026-11';
// Số dư ví cố ý khác hạn mức để thấy hai ô không lấy nhầm nguồn.
const wallets = [
  { id: 'cash', name: 'Tiền mặt', opening_balance_vnd: 1200000 },
  { id: 'bank', name: 'Ngân hàng', initial_balance_vnd: 800000 }, // ví tạo ở Thu chi trước bản sửa, chưa đồng bộ
];
const spend = (id, amount, extra = {}) => ({ id, type: 'expense', amount_vnd: amount, wallet_id: 'cash', category_code: 'food', occurred_on: today, sync_status: 'synced', ...extra });

test('hạn mức 3.000.000, đã chi 500.000 → còn 2.500.000; số dư ví là số khác', () => {
  const txs = [spend('t1', 500000)];
  const budgets = [{ id: 'b1', month, limit_vnd: 3000000 }];
  const status = getMonthBudgetStatus(budgets, txs, month);
  assert.equal(status.remaining_vnd, 2500000);
  assert.equal(status.state, 'ok');
  const overview = readLocalOverview(wallets, txs, budgets, today);
  assert.equal(overview.remaining, 2500000);
  assert.equal(overview.balance, 1500000); // 1.200.000 + 800.000 − 500.000
  assert.equal(dailyAllowance(2500000, overview.days), 108695); // 23 ngày còn lại, làm tròn xuống
});

test('đổi hạn mức thành 4.000.000 rồi lấy lại → 3.500.000; thêm chi 200.000 offline → 3.300.000 trước khi đồng bộ', () => {
  const txs = [spend('t1', 500000)];
  const budgets = [{ id: 'b1', month, limit_vnd: 4000000, sync_status: 'pending' }];
  assert.equal(readLocalOverview(wallets, txs, budgets, today).remaining, 3500000);
  txs.push(spend('t2', 200000, { sync_status: 'pending' }));
  const overview = readLocalOverview(wallets, txs, budgets, today);
  assert.equal(overview.remaining, 3300000);
  assert.equal(overview.pending, 2);
});

test('chuyển ví không đổi tổng số dư và không tính vào chi ngân sách', () => {
  const txs = [spend('t1', 500000), { id: 't3', type: 'transfer', amount_vnd: 300000, wallet_id: 'cash', destination_wallet_id: 'bank', occurred_on: today }];
  assert.equal(calculateTotalBalance(wallets, txs), 1500000);
  const per = calculateWalletBalances(wallets, txs);
  assert.equal(per.get('cash'), 400000);
  assert.equal(per.get('bank'), 1100000);
  assert.equal(getMonthBudgetStatus([{ month, limit_vnd: 3000000 }], txs, month).remaining_vnd, 2500000);
});

test('phân biệt chưa đặt hạn mức, còn đúng 0đ và vượt ngân sách', () => {
  const txs = [spend('t1', 500000)];
  const unset = getMonthBudgetStatus([], txs, month);
  assert.deepEqual([unset.state, unset.remaining_vnd, unset.limit_vnd, unset.spent_vnd], ['unset', null, null, 500000]);
  assert.equal(readLocalOverview(wallets, txs, [], today).remaining, null);
  assert.equal(dailyAllowance(null, 23), null);
  const zero = getMonthBudgetStatus([{ month, limit_vnd: 500000 }], txs, month);
  assert.deepEqual([zero.state, zero.remaining_vnd], ['zero', 0]);
  const over = getMonthBudgetStatus([{ month, limit_vnd: 300000 }], txs, month);
  assert.deepEqual([over.state, over.remaining_vnd], ['over', -200000]);
  assert.equal(dailyAllowance(-200000, 23), 0);
});

test('chỉ tính chi của đúng tháng; hạn mức tháng khác và bản ghi đã xóa bị bỏ qua', () => {
  const txs = [spend('t1', 500000), spend('t0', 999000, { occurred_on: '2026-10-31' }), spend('tx', 70000, { deleted_at: '2026-11-08' })];
  const budgets = [{ month: '2026-10', limit_vnd: 1000000 }, { month, limit_vnd: 9000000, deleted_at: '2026-11-01' }, { month, limit_vnd: 3000000 }];
  assert.equal(getMonthBudgetStatus(budgets, txs, month).remaining_vnd, 2500000);
});

test('hai bản ghi cùng tháng: ưu tiên bản đang chờ đồng bộ (vừa sửa trên máy)', () => {
  const budgets = [
    { id: 'old', month, limit_vnd: 3000000, sync_status: 'synced', updated_at: '2026-11-01T00:00:00Z' },
    { id: 'new', month, limit_vnd: 4000000, sync_status: 'pending', updated_at: '2026-11-08T08:00:00Z' },
  ];
  assert.equal(getMonthBudgetStatus(budgets, [], month).limit_vnd, 4000000);
});
