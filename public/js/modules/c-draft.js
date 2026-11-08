// Both chat and wishlist use the same explicit confirmation and shared ledger write.
import { CATEGORIES } from '../config.js';
import { generateClientUuid, saveAndQueue } from '../db.js';
import { assertCSession, readCRecords } from './c-context.js';
import { action, addOption, categoryLabels, el, field, say, validateDraft } from './c-tools.js';

export async function saveConfirmedDraft(input, { current, wishlistId = null, transactionId },
  { read = readCRecords, save = saveAndQueue, checkSession = assertCSession } = {}) {
  checkSession(current);
  if (typeof transactionId !== 'string' || !transactionId || (wishlistId && transactionId !== wishlistId)) {
    throw new Error('ID giao dịch không hợp lệ.');
  }
  const user_id = current.user.id;
  let wishlist;
  if (wishlistId) {
    wishlist = (await read('wishlist', current)).find(row => row.id === wishlistId);
    if (!wishlist || wishlist.status !== 'considering') throw new Error('Món này không còn ở trạng thái đang chờ.');
  }
  // Lookup before writing so retries after a partial save do not add a second expense.
  const existing = wishlistId && (await read('transactions', current)).find(row => row.id === transactionId);
  if (existing && existing.type !== 'expense') throw new Error('Giao dịch liên kết không đúng loại.');
  if (!existing) {
    if (wishlistId && input.type !== 'expense') throw new Error('Món đã mua chỉ ghi thành khoản chi.');
    const currentWallets = await read('wallets', current);
    const record = validateDraft(input, currentWallets);
    checkSession(current);
    await save({
      user_id, entity: 'transaction', action: 'upsert', base_version: 0,
      record: { ...record, id: transactionId, user_id },
    });
  }
  if (wishlist) {
    try {
      checkSession(current);
      await save({
        user_id, entity: 'wishlist', action: 'upsert', base_version: wishlist.version ?? 0,
        record: { ...wishlist, status: 'bought', purchased_transaction_id: transactionId },
      });
    } catch {
      throw new Error('Giao dịch đã lưu trên máy, nhưng chưa đánh dấu món đã mua. Bấm xác nhận lại để nối giao dịch, không ghi thêm khoản chi.');
    }
  }
}

export async function renderDraft(container, { current, draft, wishlistId = null, onSaved = () => {} }) {
  const root = el('section', null, { class: 'c-entry' });
  container.replaceChildren(root);
  const status = el('p', 'Đang lấy danh sách ví…', { role: 'status', class: 'c-status' });
  const close = action('Đóng');
  close.addEventListener('click', () => root.remove());
  root.append(el('h3', 'Xác nhận bản nháp giao dịch'), status);
  let wallets;
  try {
    wallets = await readCRecords('wallets', current);
    if (!wallets.length) throw new Error('Chưa có ví trên thiết bị. Hãy thêm ví ở màn Thu chi trước.');
  } catch (error) {
    say(status, error.message, true);
    root.append(close);
    return;
  }
  if (!root.isConnected) return;
  const form = el('form', null, { class: 'form c-grid' });
  const type = field(form, 'Loại', 'draft-type', { tag: 'select', required: '' });
  addOption(type, '', 'Chọn loại');
  addOption(type, 'income', 'Thu nhập'); addOption(type, 'expense', 'Chi tiêu'); addOption(type, 'transfer', 'Chuyển ví');
  type.value = draft.type ?? '';
  if (wishlistId) type.disabled = true;
  const amount = field(form, 'Số tiền (đ)', 'draft-amount', { type: 'number', min: '1', step: '1', required: '', value: draft.amount_vnd ?? '' });
  const wallet = field(form, 'Ví', 'draft-wallet', { tag: 'select', required: '' });
  const destination = field(form, 'Ví nhận', 'draft-destination', { tag: 'select' });
  for (const select of [wallet, destination]) {
    addOption(select, '', 'Chọn ví');
    for (const row of wallets) addOption(select, row.id, row.name);
  }
  wallet.value = draft.wallet_id ?? '';
  destination.value = draft.destination_wallet_id ?? '';
  const category = field(form, 'Danh mục', 'draft-category', { tag: 'select' });
  const date = field(form, 'Ngày giao dịch', 'draft-date', { type: 'date', required: '', value: draft.occurred_on ?? '' });
  const note = field(form, 'Ghi chú', 'draft-note', { maxlength: '500', value: draft.note ?? '' });
  function updateFields(value = '') {
    const transfer = type.value === 'transfer';
    category.parentElement.hidden = transfer;
    destination.parentElement.hidden = !transfer;
    category.required = !transfer;
    destination.required = transfer;
    category.replaceChildren();
    addOption(category, '', 'Chọn danh mục');
    for (const key of CATEGORIES[type.value] ?? []) addOption(category, key, categoryLabels[key]);
    category.value = value;
  }
  type.addEventListener('change', () => updateFields());
  updateFields(draft.category_code ?? '');
  const actions = el('div', null, { class: 'c-actions' });
  const confirm = action('Xác nhận lưu giao dịch', 'submit');
  const cancel = action('Hủy bản nháp');
  cancel.addEventListener('click', () => root.remove());
  actions.append(confirm, cancel);
  form.append(actions);
  root.append(form);
  say(status, 'Kiểm tra thông tin rồi bấm xác nhận. Bản nháp chưa được ghi vào sổ.');
  // Wishlist ID is also the transaction ID in its separate store, so reopening after
  // a partial save can finish linking the purchase without adding another expense.
  const transactionId = wishlistId ?? generateClientUuid();
  let saving = false;
  let finished = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || finished || !form.reportValidity()) return;
    const input = {
      type: type.value, amount_vnd: amount.valueAsNumber, wallet_id: wallet.value,
      destination_wallet_id: destination.value, category_code: category.value,
      occurred_on: date.value, note: note.value,
    };
    saving = true;
    confirm.disabled = cancel.disabled = true;
    try {
      await saveConfirmedDraft(input, { current, wishlistId, transactionId });
      finished = true;
      form.remove();
      root.append(close);
      say(status, 'Đã lưu trên thiết bị. Chưa xác nhận đồng bộ lên máy chủ.');
      onSaved();
    } catch (error) {
      say(status, String(error.message).includes('NOT_IMPLEMENTED') ? 'Chưa ghép chức năng lưu của B. Không có giao dịch nào được ghi.' : error.message, true);
    } finally {
      saving = false;
      confirm.disabled = finished;
      cancel.disabled = false;
    }
  });
}
