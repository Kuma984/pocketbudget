const DB_NAME = 'PocketBudgetDB';
const DB_VERSION = 3;
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains('transactions')) {
        const store = dbInstance.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!dbInstance.objectStoreNames.contains('outbox')) {
        dbInstance.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

async function addTransaction(tx) {
  return new Promise((resolve, reject) => {
    const txObject = { 
      ...tx, 
      wallet: tx.wallet || 'Ví tiền mặt',
      date: tx.date || new Date().toISOString() 
    };
    const transaction = db.transaction(['transactions', 'outbox'], 'readwrite');
    
    transaction.objectStore('transactions').add(txObject);
    transaction.objectStore('outbox').add({ action: 'CREATE', payload: txObject, timestamp: Date.now() });

    transaction.oncomplete = () => resolve(txObject);
    transaction.onerror = (e) => reject(e.target.error);
  });
}

async function deleteTransaction(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions', 'outbox'], 'readwrite');
    transaction.objectStore('transactions').delete(id);
    transaction.objectStore('outbox').add({ action: 'DELETE', payload: { id }, timestamp: Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e.target.error);
  });
}

async function getAllTransactions() {
  return new Promise((resolve) => {
    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.reverse());
  });
}