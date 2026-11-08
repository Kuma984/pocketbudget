import { t } from '../i18n.js';
import { generateClientUuid, saveAndQueue } from '../db.js';
import { isValidAmount } from '../domain/finance.js';
import { assertCSession, getCSession, openSimulation, readCRecords, takeWishlistPreset } from './c-context.js';
import { renderDraft } from './c-draft.js';
import { action, el, field, isDate, money, say, todayLocal } from './c-tools.js';

const getLabels = () => ({ considering: t('wishlist_status_considering'), bought: t('wishlist_status_bought'), skipped: t('wishlist_status_skipped') });

export function render(container) {
  const root = el('section', null, { class: 'card c-module' });
  container.replaceChildren(root);
  const status = el('p', 'Đang lấy dữ liệu trên thiết bị…', { role: 'status', class: 'c-status' });
  const body = el('div');
  const draftArea = el('div');
  root.append(el('h2', t('wishlist_header_title')), el('p', t('wishlist_header_desc'), { class: 'section-desc' }), status, body, draftArea);
  const preset = takeWishlistPreset();
  let current;
  let editing = null;
  let busy = false;
  let rows = [];
  const form = el('form', null, { class: 'form c-grid' });
  const name = field(form, t('wishlist_item_name'), 'wishlist-name', { maxlength: '120', required: '', value: preset?.name ?? '' });
  const price = field(form, t('wishlist_price_label'), 'wishlist-price', { type: 'number', min: '1', step: '1', required: '', value: preset?.price_vnd ?? '' });
  const review = field(form, t('wishlist_review_label'), 'wishlist-review', { type: 'date', required: '', value: todayLocal() });
  const actions = el('div', null, { class: 'c-actions' });
  const save = action(t('wishlist_btn_add'), 'submit');
  const reset = action(t('wishlist_btn_cancel_edit'));
  reset.hidden = true;
  const list = el('div', null, { class: 'c-list' });
  actions.append(save, reset); form.append(actions);
  const resetForm = () => {
    editing = null; form.reset(); review.value = todayLocal(); save.textContent = t('wishlist_btn_add'); reset.hidden = true;
  };
  reset.addEventListener('click', resetForm);
  function draw() {
    list.replaceChildren();
    if (!rows.length) { list.append(el('p', t('wishlist_empty'), { class: 'c-muted' })); return; }
    const now = todayLocal();
    const ordered = [...rows].sort((a, b) => String(a.review_on).localeCompare(String(b.review_on)));
    for (const row of ordered) {
      const due = row.status === 'considering' && row.review_on <= now;
      const entry = el('article', null, { class: 'c-entry' });
      entry.append(el('h3', row.name), el('p', [money(row.price_vnd), getLabels()[row.status] ?? row.status, 'Xem lại: ' + row.review_on, due ? t('wishlist_due_badge') : ''].filter(Boolean).join(' · ')));
      if (row.status === 'considering') {
        const edit = action(t('wishlist_btn_edit'));
        const simulate = action(t('wishlist_btn_sim'));
        const buy = action(t('wishlist_btn_buy'));
        const skip = action(t('wishlist_btn_skip'));
        const rowActions = el('div', null, { class: 'c-row-actions' });
        rowActions.append(edit, simulate, buy, skip); entry.append(rowActions);
        edit.addEventListener('click', () => {
          editing = row.id; name.value = row.name; price.value = row.price_vnd; review.value = row.review_on;
          save.textContent = t('wishlist_btn_save_edit'); reset.hidden = false; name.focus();
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
