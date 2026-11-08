import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocalOverview, expenseSummary, isDate, validateDraft } from '../public/js/modules/c-tools.js';

const wallet = { id: 'w1', opening_balance_vnd: 1000000 };
const food = { type: 'expense', amount_vnd: 45000, occurred_on: '2026-11-06', category_code: 'food', sync_status: 'pending' };
test('overview keeps negative budgets, excludes transfers and computes days inclusive', () => {
  const rows = [food, { ...food, type: 'transfer' }, { ...food, deleted_at: '2026-11-06' }];
  const overview = readLocalOverview([wallet], rows, [{ month: '2026-11', limit_vnd: 10000 }], '2026-11-06');
  assert.deepEqual({ balance: overview.balance, remaining: overview.remaining, days: overview.days },
    { balance: 955000, remaining: -35000, days: 25 });
  assert.equal(overview.state, 'over');
  assert.equal(overview.pending, 2); // food + transfer đang pending; bản đã xóa không tính
});

test('summary respects selected month and category, including pending data', () => {
  const rows = [food, { ...food, category_code: 'shopping' }, { ...food, occurred_on: '2026-12-01' },
    { ...food, type: 'income' }, { ...food, deleted_at: '2026-11-07' }];
  assert.deepEqual(expenseSummary(rows, 'last_month', 'food', '2026-12-01'),
    { month: '2026-11', total: 45000, count: 1, unsynced: 1 });
});

test('draft cannot select a wallet from outside the account, an invalid date or a mismatched category', () => {
  const draft = { type: 'expense', amount_vnd: 45000, wallet_id: 'w1', category_code: 'food', occurred_on: '2026-11-06', note: 'Ăn trưa' };
  assert.equal(validateDraft(draft, [wallet]).amount_vnd, 45000);
  assert.throws(() => validateDraft({ ...draft, wallet_id: 'foreign' }, [wallet]), /ví/);
  assert.throws(() => validateDraft({ ...draft, occurred_on: '2026-02-30' }, [wallet]), /Ngày/);
  assert.throws(() => validateDraft({ ...draft, category_code: 'salary' }, [wallet]), /danh mục/);
  assert.throws(() => validateDraft({ ...draft, type: 'transfer', destination_wallet_id: 'w1' }, [wallet]), /ví nhận/);
  assert.equal(isDate('2024-02-29'), true);
});

import { saveConfirmedDraft } from '../public/js/modules/c-draft.js';

test('confirming the purchase after its status write fails does not create a second ledger expense', async () => {
  const current = { user: { id: '12' } };
  const wishlist = { id: 'purchase-1', status: 'considering', version: 1 };
  const rows = { wishlist: [wishlist], wallets: [wallet], transactions: [] };
  let failOnce = true;
  let ledgerWrites = 0;
  const adapters = {
    checkSession: expected => assert.equal(expected, current),
    read: async store => rows[store],
    save: async change => {
      if (change.entity === 'transaction') {
        ledgerWrites++;
        rows.transactions.push(change.record);
      } else if (failOnce) {
        failOnce = false;
        throw new Error('Local failure');
      } else {
        assert.equal(change.record.purchased_transaction_id, 'purchase-1');
        assert.equal(change.base_version, 1);
        rows.wishlist[0] = change.record;
      }
    },
  };
  const input = { type: 'expense', amount_vnd: 45000, wallet_id: 'w1', category_code: 'food', occurred_on: '2026-11-06', note: 'Ăn trưa' };
  const options = { current, wishlistId: 'purchase-1', transactionId: 'purchase-1' };
  await assert.rejects(saveConfirmedDraft(input, options, adapters), /chưa đánh dấu/);
  await saveConfirmedDraft(input, options, adapters);
  assert.equal(ledgerWrites, 1);
  assert.equal(rows.wishlist[0].status, 'bought');
  await assert.rejects(saveConfirmedDraft(input, options, adapters), /không còn/);
});

test('rejected invalid draft makes no shared ledger write', async () => {
  let saved = false;
  await assert.rejects(saveConfirmedDraft({
    type: 'expense', amount_vnd: 10, wallet_id: 'foreign', category_code: 'food',
    occurred_on: '2026-11-06', note: '',
  }, { current: { user: { id: '12' } }, transactionId: 'id-1' }, {
    checkSession: () => {},
    read: async () => [wallet],
    save: async () => { saved = true; },
  }), /Chọn một ví/);
  assert.equal(saved, false);
});

import { describeSpendingCapacity } from '../public/js/modules/c-tools.js';
import { simulatePurchase } from '../public/js/domain/finance.js';

// money() dùng Intl vi-VN: dấu cách trước ₫ là NBSP, nên so sánh sau khi chuẩn hóa khoảng trắng.
const plain = text => text.replace(/\s/g, ' ');
const capacityRow = input => {
  const r = simulatePurchase(input);
  return ['before', 'after'].map(side => plain(describeSpendingCapacity(r[`flexible_${side}_vnd`], r[`daily_${side}_vnd`]).text));
};

test('khả năng chi tiêu: âm hiện tổng tiền thiếu, không chia theo ngày', () => {
  // 23 ngày, tiền linh hoạt −500.000 trước và −900.000 nếu mua (trước đây hiện −39.131 ₫/ngày).
  const row = capacityRow({ balance_vnd: 1000000, budget_remaining_vnd: -500000, price_vnd: 400000, days_remaining: 23 });
  assert.deepEqual(row, ['Thiếu 500.000 ₫', 'Thiếu 900.000 ₫']);
});

test('khả năng chi tiêu: trước khi mua còn chi được mỗi ngày, sau khi mua thì thiếu', () => {
  const row = capacityRow({ balance_vnd: 3000000, budget_remaining_vnd: 2500000, price_vnd: 3000000, days_remaining: 23 });
  assert.deepEqual(row, ['Có thể chi khoảng 108.695 ₫/ngày', 'Thiếu 500.000 ₫']);
});

test('khả năng chi tiêu: bằng 0 không hiện mức chi/ngày', () => {
  const row = capacityRow({ balance_vnd: 1000000, budget_remaining_vnd: 400000, price_vnd: 400000, days_remaining: 10 });
  assert.deepEqual(row, ['Có thể chi khoảng 40.000 ₫/ngày', 'Không còn tiền linh hoạt để chi']);
});

test('khả năng chi tiêu: tiền thiếu lấy từ tiền linh hoạt, không lấy từ số dư', () => {
  // Số dư sau mua còn dương (100.000) nhưng tiền giữ riêng 300.000 → linh hoạt −200.000.
  const r = simulatePurchase({ balance_vnd: 500000, budget_remaining_vnd: 5000000, price_vnd: 400000, days_remaining: 5, reserved_vnd: 300000 });
  assert.equal(r.balance_after_vnd, 100000);
  assert.equal(plain(describeSpendingCapacity(r.flexible_after_vnd, r.daily_after_vnd).text), 'Thiếu 200.000 ₫');
});
