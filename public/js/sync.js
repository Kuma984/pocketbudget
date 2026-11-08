import { apiRequest } from './api.js';
import { listRecords, openDatabase } from './db.js';

const stores = { wallet: 'wallets', transaction: 'transactions', budget: 'budgets', wishlist: 'wishlist' };
const running = new Map();
const compareOperations = (a, b) => (a.queue_order ?? 0) - (b.queue_order ?? 0)
  || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
const resultOf = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
function complete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error ?? new Error('Lưu IndexedDB bị hủy.'));
    tx.onerror = () => reject(tx.error);
  });
}
function serial(userId, work) {
  const previous = running.get(userId) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(() => navigator.locks?.request
    ? navigator.locks.request('pocketbudget-sync:' + userId, work)
    : work()).finally(() => { if (running.get(userId) === run) running.delete(userId); });
  running.set(userId, run);
  return run;
}

async function mergeSnapshot(userId, snapshot) {
  let pulled = 0;
  if (String(snapshot.user_id) !== userId) throw new Error('Snapshot không thuộc phiên hiện tại.');
  for (const name of Object.values(stores)) {
    if (!Array.isArray(snapshot[name])) throw new Error('Snapshot không đúng định dạng.');
  }
  const db = await openDatabase();
  try {
    const tx = db.transaction([...Object.values(stores), 'outbox'], 'readwrite');
    const done = complete(tx);
    const pending = await resultOf(tx.objectStore('outbox').index('user_id').getAll(userId));
    const localKeys = new Set(pending.map(op => op.entity + ':' + op.entity_id));
    for (const [entity, name] of Object.entries(stores)) {
      const store = tx.objectStore(name);
      for (const row of snapshot[name]) {
        if (localKeys.has(entity + ':' + row.id)) continue;
        const record = { ...row, user_id: userId, sync_status: 'synced', version: Number(row.version) };
        for (const key of ['amount_vnd', 'opening_balance_vnd', 'limit_vnd', 'price_vnd']) {
          if (Object.hasOwn(record, key)) record[key] = Number(record[key]);
        }
        // The dashboard keeps receipt photos on this device only.
        const local = await resultOf(store.get(record.id));
        if (local && local.user_id !== userId) continue;
        if (entity === 'transaction' && !record.deleted_at && local?.user_id === userId && local.image) record.image = local.image;
        store.put(record);
        pulled++;
      }
    }
    await done;
    return pulled;
  } finally { db.close(); }
}

async function ack(userId, op, receipt) {
  const db = await openDatabase();
  try {
    const name = stores[op.entity];
    const tx = db.transaction([name, 'outbox'], 'readwrite');
    const done = complete(tx);
    const outbox = tx.objectStore('outbox');
    const store = tx.objectStore(name);
    const [queue, record] = await Promise.all([
      resultOf(outbox.index('user_id').getAll(userId)),
      resultOf(store.get(op.entity_id)),
    ]);
    const later = queue.filter(row => row.id !== op.id && row.entity === op.entity && row.entity_id === op.entity_id)
      .sort(compareOperations);
    outbox.delete(op.id);
    if (later.length) outbox.put({ ...later[0], base_version: receipt.version });
    if (record?.user_id === userId) {
      store.put({ ...record, version: receipt.version, sync_status: later.length ? 'pending' : 'synced' });
    }
    await done;
  } finally { db.close(); }
}

async function authenticated(expectedId) {
  const auth = await apiRequest('auth.php?action=me');
  if (String(auth.user?.id) !== expectedId || !auth.csrf_token) {
    throw new Error('Tài khoản đã thay đổi. Hãy đăng nhập lại.');
  }
  return auth;
}

export function pullSnapshot(userId) {
  const id = String(userId);
  return serial(id, async () => {
    await authenticated(id);
    const snapshot = await apiRequest('snapshot.php');
    return { pushed: 0, pulled: await mergeSnapshot(id, snapshot) };
  });
}

export function syncNow(userId) {
  const id = String(userId);
  return serial(id, async () => {
    const auth = await authenticated(id);
    let sent = 0;
    // Each acknowledged local change updates the version of the next change to that same row.
    const count = (await listRecords('outbox', id)).length;
    while (sent < count) {
      const op = (await listRecords('outbox', id)).sort(compareOperations)[0];
      if (!op) break;
      const { image, ...record } = op.record; // Receipt image never leaves this device.
      const wireOp = { ...op, record };
      const { results } = await apiRequest('sync.php', {
        method: 'POST', csrfToken: auth.csrf_token, body: { operations: [wireOp] },
      });
      const result = results?.find(item => item.operation_id === op.operation_id);
      if (!result?.ok || result.record?.id !== op.entity_id || !Number.isSafeInteger(result.record?.version)) {
        throw new Error(result?.error?.message ?? 'Máy chủ chưa xác nhận thao tác; dữ liệu vẫn ở máy.');
      }
      await ack(id, op, result.record);
      sent++;
    }
    const snapshot = await apiRequest('snapshot.php');
    return { pushed: sent, pulled: await mergeSnapshot(id, snapshot) };
  });
}
