import { calculateWalletBalances, calculateTotalBalance } from '../public/js/domain/finance.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonthTotals, simulatePurchase, isValidAmount } from '../public/js/domain/finance.js';

test('month totals exclude transfer, deleted and other-month records; pending is still a real local record', () => {
  const row = { occurred_on: '2026-10-29', amount_vnd: 45000, type: 'expense', deleted_at: null };
  const result = getMonthTotals([
    { ...row, amount_vnd: 1000000, type: 'income' },
    { ...row, sync_status: 'pending' },
    { ...row, amount_vnd: 300000, type: 'transfer' },
    { ...row, deleted_at: '2026-10-29T01:00:00Z' },
    { ...row, occurred_on: '2026-09-30' },
  ], '2026-10');
  assert.deepEqual(result, { income_vnd: 1000000, expense_vnd: 45000, net_vnd: 955000 });
});
test('purchase preview changes the scenario, never the input', () => {
  const input = Object.freeze({ balance_vnd: 1000000, budget_remaining_vnd: 1000000, price_vnd: 400000, days_remaining: 10 });
  const result = simulatePurchase(input);
  assert.equal(result.balance_after_vnd, 600000);
  assert.equal(result.daily_before_vnd, 100000);
  assert.equal(result.daily_after_vnd, 60000);
  assert.equal(input.balance_vnd, 1000000);
});
test('lower budget and reserved money are not added together as spendable cash', () => {
  const result = simulatePurchase({ balance_vnd: 2000000, budget_remaining_vnd: 500000, reserved_vnd: 300000, price_vnd: 200000, days_remaining: 10 });
  assert.equal(result.flexible_before_vnd, 500000);
  assert.equal(result.daily_after_vnd, 30000);
});
test('overspending remains negative, not silently clamped to zero', () => {
  const result = simulatePurchase({ balance_vnd: 100000, budget_remaining_vnd: 80000, price_vnd: 150000, days_remaining: 7 });
  assert.equal(result.flexible_after_vnd, -70000);
  assert.equal(result.exceeds_available, true);
});
test('invalid money/days rejected', () => {
  assert.equal(isValidAmount(1.5), false);
  assert.equal(isValidAmount(0), false);
  assert.equal(isValidAmount(Number.MAX_SAFE_INTEGER + 1), false);
  assert.throws(() => simulatePurchase({ balance_vnd: 1, budget_remaining_vnd: 1, price_vnd: 1, days_remaining: 0 }));
});


test('wallet balances and total balance calculate correctly with transfer invariance', () => {
  const wallets = [
    { id: 'w1', name: 'Tiền mặt', opening_balance_vnd: 200000 },
    { id: 'w2', name: 'Ngân hàng', opening_balance_vnd: 1000000 },
  ];
  const txs = [
    { id: 't1', wallet_id: 'w2', destination_wallet_id: null, type: 'income', amount_vnd: 500000, occurred_on: '2026-10-01' },
    { id: 't2', wallet_id: 'w1', destination_wallet_id: null, type: 'expense', amount_vnd: 50000, occurred_on: '2026-10-02' },
    // Transfer w2 -> w1: 300,000 VND
    { id: 't3', wallet_id: 'w2', destination_wallet_id: 'w1', type: 'transfer', amount_vnd: 300000, occurred_on: '2026-10-03' },
  ];

  // Tính trước khi transfer
  const totalBefore = 200000 + 1000000 + 500000 - 50000; // 1,650,000 VND
  assert.equal(totalBefore, 1650000);

  // w1 = 200,000 - 50,000 + 300,000 = 450,000
  // w2 = 1,000,000 + 500,000 - 300,000 = 1,200,000
  // Tổng = 450,000 + 1,200,000 = 1,650,000 (không đổi!)
  const balances = calculateWalletBalances(wallets, txs);
  assert.equal(balances.get('w1'), 450000);
  assert.equal(balances.get('w2'), 1200000);

  const total = calculateTotalBalance(wallets, txs);
  assert.equal(total, 1650000);
});
