import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocalOverview, expenseSummary, isDate, validateDraft } from '../public/js/modules/c-tools.js';

const wallet = { id: 'w1', opening_balance_vnd: 1000000 };
const food = { type: 'expense', amount_vnd: 45000, occurred_on: '2026-11-06', category_code: 'food', sync_status: 'pending' };
test('overview keeps negative budgets, excludes transfers and computes days inclusive', () => {
  const rows = [food, { ...food, type: 'transfer' }, { ...food, deleted_at: '2026-11-06' }];
  assert.deepEqual(readLocalOverview([wallet], rows, [{ month: '2026-11', limit_vnd: 10000 }], '2026-11-06'),
    { balance: 955000, remaining: -35000, days: 25 });
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
