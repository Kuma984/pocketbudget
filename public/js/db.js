import { DB_NAME, DB_VERSION } from './config.js';

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['wallets', 'transactions', 'budgets', 'wishlist', 'outbox']) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('user_id', 'user_id', { unique: false });
        }
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Đóng tab cũ trước khi nâng phiên bản database.'));
  });
}

function getStoreNameForEntity(entity) {
  if (entity === 'wishlist') return 'wishlist';
  if (entity.endsWith('s')) return entity;
  return `${entity}s`;
}

export function generateClientUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Đọc toàn bộ bản ghi của một store thuộc về đúng userId, bỏ qua các tombstone đã xóa.
 */
export async function listRecords(storeName, userId) {
  if (!userId) {
    throw new Error('Cần userId để đọc dữ liệu phân vùng.');
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('user_id');
    const req = index.getAll(IDBKeyRange.only(String(userId)));

    req.onsuccess = () => {
      const records = req.result || [];
      // Lọc bỏ các bản ghi đã xóa (tombstone)
      resolve(records.filter(r => !r.deleted_at));
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = tx.onabort = () => db.close();
  });
}

/**
 * Lưu thay đổi thực thể và hàng đợi outbox nguyên tử trong một transaction IndexedDB.
 */
export async function saveAndQueue({ user_id, entity, action, record, base_version }) {
  if (!user_id) throw new Error('user_id là bắt buộc.');
  if (!entity || !action || !record) throw new Error('Thiếu tham số bắt buộc cho saveAndQueue.');

  const storeName = getStoreNameForEntity(entity);
  const db = await openDatabase();
  const operationId = generateClientUuid();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName, 'outbox', 'meta'], 'readwrite');
    const entityStore = tx.objectStore(storeName);
    const outboxStore = tx.objectStore('outbox');

    const owner = String(user_id);
    let updatedRecord;
    let writeError;
    const lookup = entityStore.get(record.id);
    lookup.onsuccess = () => {
      const previous = lookup.result;
      if (previous && previous.user_id !== owner) {
        writeError = new Error('Bản ghi không thuộc tài khoản đang dùng.');
        tx.abort();
        return;
      }
      const baseVersion = base_version ?? previous?.version ?? 0;
      updatedRecord = {
        ...previous,
        ...record,
        user_id: owner,
        sync_status: 'pending',
        version: baseVersion || 1,
        deleted_at: action === 'delete' ? new Date().toISOString() : null,
      };
      entityStore.put(updatedRecord);
      const op = {
        id: operationId, operation_id: operationId, user_id: owner, entity, action,
        entity_id: record.id, base_version: baseVersion,
        record: { ...record }, created_at: new Date().toISOString(),
      };
      const meta = tx.objectStore('meta');
      const counterKey = 'queue-order:' + owner;
      const counter = meta.get(counterKey);
      counter.onsuccess = () => {
        op.queue_order = (counter.result?.value ?? 0) + 1;
        meta.put({ id: counterKey, value: op.queue_order });
        outboxStore.put(op);
      };
    };

    tx.oncomplete = () => { db.close(); resolve({ operation_id: operationId, record: updatedRecord }); };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => { db.close(); reject(writeError || tx.error || new Error('Giao dịch IndexedDB bị hủy.')); };
  });
}
