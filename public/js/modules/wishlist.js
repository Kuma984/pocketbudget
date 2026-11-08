import { generateClientUuid, saveAndQueue } from '../db.js';
import { isValidAmount } from '../domain/finance.js';
import { assertCSession, getCSession, openSimulation, readCRecords, takeWishlistPreset } from './c-context.js';
import { renderDraft } from './c-draft.js';
import { action, el, field, isDate, money, say, todayLocal } from './c-tools.js';

const labels = { considering: 'Đang chờ', bought: 'Đã mua', skipped: 'Bỏ qua' };

export function render(container) {
  const root = el('section', null, { class: 'card c-module' });
  container.replaceChildren(root);
  const status = el('p', 'Đang lấy dữ liệu trên thiết bị…', { role: 'status' });
  const body = el('div');
  const draftArea = el('div');
  root.append(el('h2', 'Danh sách chờ mua'), el('p', 'Lưu món muốn mua và chọn ngày xem lại. Đưa món vào danh sách chưa làm thay đổi số dư.'), status, body, draftArea);
  const preset = takeWishlistPreset();
  let current;
  let editing = null;
  let busy = false;
  let rows = [];
  const form = el('form', null, { class: 'c-grid' });
  const name = field(form, 'Tên món', 'wishlist-name', { maxlength: '120', required: '', value: preset?.name ?? '' });
  const price = field(form, 'Giá dự kiến (đ)', 'wishlist-price', { type: 'number', min: '1', step: '1', required: '', value: preset?.price_vnd ?? '' });
  const review = field(form, 'Ngày xem lại', 'wishlist-review', { type: 'date', required: '', value: todayLocal() });
  const actions = el('div', null, { class: 'c-actions' });
  const save = action('Thêm món', 'submit');
  const reset = action('Bỏ chỉnh sửa');
  reset.hidden = true;
  const list = el('div');
  actions.append(save, reset); form.append(actions);
  const resetForm = () => {
    editing = null; form.reset(); review.value = todayLocal(); save.textContent = 'Thêm món'; reset.hidden = true;
  };
  reset.addEventListener('click', resetForm);
  function draw() {
    list.replaceChildren();
    if (!rows.length) { list.append(el('p', 'Chưa có món nào trong danh sách.')); return; }
    const now = todayLocal();
    const ordered = [...rows].sort((a, b) => String(a.review_on).localeCompare(String(b.review_on)));
    for (const row of ordered) {
      const due = row.status === 'considering' && row.review_on <= now;
      const entry = el('article', null, { class: 'c-entry' });
      entry.append(el('h3', row.name), el('p', [money(row.price_vnd), labels[row.status] ?? row.status, 'Xem lại: ' + row.review_on, due ? 'Đến ngày xem lại' : ''].filter(Boolean).join(' · ')));
      if (row.status === 'considering') {
        const edit = action('Sửa');
        const simulate = action('Mô phỏng');
        const buy = action('Đã mua…');
        const skip = action('Bỏ qua');
        const rowActions = el('div', null, { class: 'c-actions' });
        rowActions.append(edit, simulate, buy, skip); entry.append(rowActions);
        edit.addEventListener('click', () => {
          editing = row.id; name.value = row.name; price.value = row.price_vnd; review.value = row.review_on;
          save.textContent = 'Lưu chỉnh sửa'; reset.hidden = false; name.focus();
        });
        simulate.addEventListener('click', () => openSimulation({ item_name: row.name, price_vnd: row.price_vnd }));
        buy.addEventListener('click', () => {
          if (draftArea.firstElementChild || busy) return;
          void renderDraft(draftArea, {
            current, wishlistId: row.id,
            draft: { type: 'expense', amount_vnd: row.price_vnd, occurred_on: now, category_code: 'shopping', note: row.name },
            onSaved: () => { void refresh().catch(error => say(status, error.message, true)); },
          });
        });
        skip.addEventListener('click', () => void persist({ ...row, status: 'skipped' }, skip));
      }
      list.append(entry);
    }
  }
  async function refresh() {
    rows = await readCRecords('wishlist', current);
    if (root.isConnected) draw();
  }
  async function persist(record, trigger, onSuccess = () => {}) {
    if (busy) return;
    busy = true; trigger.disabled = true;
    try {
      assertCSession(current);
      await saveAndQueue({
        user_id: current.user.id, entity: 'wishlist', action: 'upsert', base_version: record.version ?? 0,
        record: { ...record, user_id: current.user.id },
      });
      say(status, 'Đã lưu danh sách trên thiết bị. Chưa xác nhận đồng bộ.');
      onSuccess();
      try { await refresh(); } catch (error) { say(status, 'Đã lưu, nhưng chưa tải lại được danh sách: ' + error.message, true); }
    } catch (error) {
      say(status, String(error.message).includes('NOT_IMPLEMENTED') ? 'Chưa ghép chức năng lưu của B. Món chưa được lưu.' : error.message, true);
    } finally { busy = false; trigger.disabled = false; }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!name.value.trim() || !isValidAmount(price.valueAsNumber) || !isDate(review.value)) {
      say(status, 'Kiểm tra tên, số tiền và ngày xem lại.', true); return;
    }
    const original = editing && rows.find(row => row.id === editing && row.status === 'considering');
    if (editing && !original) { say(status, 'Món này không còn ở trạng thái đang chờ.', true); return; }
    void persist({
      ...(original || { id: generateClientUuid(), status: 'considering', purchased_transaction_id: null }),
      name: name.value.trim(), price_vnd: price.valueAsNumber, review_on: review.value,
    }, save, resetForm);
  });
  async function load() {
    body.replaceChildren();
    say(status, 'Đang lấy dữ liệu trên thiết bị…');
    try {
      current = await getCSession();
      await refresh();
      if (!root.isConnected) return;
      body.append(form, list);
      say(status, 'Danh sách đọc từ thiết bị này.');
    } catch (error) {
      say(status, error.message, true);
      const retry = action('Thử lại');
      retry.addEventListener('click', () => void load());
      body.append(retry);
    }
  }
  void load();
}
