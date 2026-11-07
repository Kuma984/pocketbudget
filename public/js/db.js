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
  });
}

/**
 * Lưu thay đổi thực thể và hàng đợi outbox nguyên tử trong một transaction IndexedDB.
 */
export async function saveAndQueue({ user_id, entity, action, record, base_version = 0 }) {
  if (!user_id) throw new Error('user_id là bắt buộc.');
  if (!entity || !action || !record) throw new Error('Thiếu tham số bắt buộc cho saveAndQueue.');

  const storeName = getStoreNameForEntity(entity);
  const db = await openDatabase();
  const operationId = generateClientUuid();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName, 'outbox'], 'readwrite');
    const entityStore = tx.objectStore(storeName);
    const outboxStore = tx.objectStore('outbox');

    // 1. Chuẩn bị bản ghi thực thể
    const updatedRecord = {
      ...record,
      user_id: String(user_id),
      sync_status: 'pending',
      version: record.version || (base_version > 0 ? base_version : 1),
    };

    if (action === 'delete') {
      updatedRecord.deleted_at = new Date().toISOString();
    }

    entityStore.put(updatedRecord);

    // 2. Chuẩn bị thao tác outbox
    const op = {
      id: operationId,
      operation_id: operationId,
      user_id: String(user_id),
      entity,
      action,
      entity_id: record.id,
      base_version,
      record: { ...record },
      created_at: new Date().toISOString(),
    };

    outboxStore.put(op);

    tx.oncomplete = () => resolve({ operation_id: operationId, record: updatedRecord });
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Giao dịch IndexedDB bị hủy.'));
  });
}

/**
 * Đọc tất cả các thao tác đang chờ trong outbox của một user
 */
export async function getOutboxOperations(userId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['outbox'], 'readonly');
    const store = tx.objectStore('outbox');
    const index = store.index('user_id');
    const req = index.getAll(IDBKeyRange.only(String(userId)));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Xóa các thao tác đã được máy chủ xác nhận (ACK) khỏi outbox
 */
export async function clearOutboxOperations(userId, opIds) {
  if (!opIds || opIds.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['outbox'], 'readwrite');
    const store = tx.objectStore('outbox');
    opIds.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Trộn dữ liệu snapshot từ server về IndexedDB mà không đè lên các bản ghi đang pending sửa
 */
export async function mergeSnapshotData(userId, snapshot) {
  const db = await openDatabase();
  const stores = ['wallets', 'transactions', 'budgets', 'wishlist'];
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...stores, 'outbox'], 'readwrite');
    const outboxStore = tx.objectStore('outbox');
    const outboxReq = outboxStore.index('user_id').getAll(IDBKeyRange.only(String(userId)));

    outboxReq.onsuccess = () => {
      const pendingOps = outboxReq.result || [];
      const pendingEntityIds = new Set(pendingOps.map(op => op.entity_id));

      for (const entityKey of ['wallets', 'transactions', 'budgets', 'wishlist']) {
        const storeName = getStoreNameForEntity(entityKey);
        const store = tx.objectStore(storeName);
        const items = snapshot[entityKey] || [];

        for (const item of items) {
          // Nếu item đang có thay đổi chờ đồng bộ ở outbox, giữ lại bản local
          if (pendingEntityIds.has(item.id)) {
            continue;
          }

          const localRecord = {
            ...item,
            user_id: String(userId),
            sync_status: 'synced',
          };
          store.put(localRecord);
        }
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
