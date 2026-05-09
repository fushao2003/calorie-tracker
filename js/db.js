const DB_NAME = 'CalorieTracker';
const DB_VERSION = 1;
const STORE_NAME = 'records';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(mode, callback) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = callback(store);
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
}

function addRecord(record) {
  return withStore('readwrite', (store) => store.add(record));
}

function getTodayRecords() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 86400000);

  return withStore('readonly', (store) => {
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
    return index.getAll(range);
  }).then((records) =>
    records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  );
}

function getRecordsByDate(dateStr) {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 86400000);

  return withStore('readonly', (store) => {
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
    return index.getAll(range);
  }).then((records) =>
    records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  );
}

function getAllDates() {
  return withStore('readonly', (store) => store.getAll()).then((records) => {
    const dates = new Set();
    records.forEach((r) => {
      dates.add(r.timestamp.slice(0, 10));
    });
    return Array.from(dates).sort().reverse();
  });
}

function deleteRecord(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

function getTotalCalories(records) {
  return records.reduce((sum, r) => sum + r.calories, 0);
}
