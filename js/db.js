const DB_NAME = 'CalorieTracker';
const DB_VERSION = 2;
const STORE_RECORDS = 'records';
const STORE_FOODS = 'foods';
const STORE_TEMPLATES = 'mealTemplates';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (e.oldVersion < 1) {
        const store = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (e.oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_FOODS)) {
          db.createObjectStore(STORE_FOODS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
          db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(storeName, mode, callback) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);
      tx.oncomplete = () => resolve(result.result !== undefined ? result.result : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
}

// ── Records ──

function addRecord(record) {
  return withStore(STORE_RECORDS, 'readwrite', (store) => store.add(record));
}

function getTodayRecords() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 86400000);

  return withStore(STORE_RECORDS, 'readonly', (store) => {
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

  return withStore(STORE_RECORDS, 'readonly', (store) => {
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
    return index.getAll(range);
  }).then((records) =>
    records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  );
}

function getAllDates() {
  return withStore(STORE_RECORDS, 'readonly', (store) => store.getAll()).then((records) => {
    const dates = new Set();
    records.forEach((r) => {
      dates.add(r.timestamp.slice(0, 10));
    });
    return Array.from(dates).sort().reverse();
  });
}

function deleteRecord(id) {
  return withStore(STORE_RECORDS, 'readwrite', (store) => store.delete(id));
}

function getTotalCalories(records) {
  return records.reduce((sum, r) => sum + r.calories, 0);
}

// ── Foods ──

function getAllFoods() {
  return withStore(STORE_FOODS, 'readonly', (store) => store.getAll());
}

function addFood(food) {
  return withStore(STORE_FOODS, 'readwrite', (store) => store.add(food));
}

function updateFood(food) {
  return withStore(STORE_FOODS, 'readwrite', (store) => store.put(food));
}

function deleteFood(id) {
  return withStore(STORE_FOODS, 'readwrite', (store) => store.delete(id));
}

// ── Meal Templates ──

function getAllTemplates() {
  return withStore(STORE_TEMPLATES, 'readonly', (store) => store.getAll());
}

function addTemplate(template) {
  return withStore(STORE_TEMPLATES, 'readwrite', (store) => store.add(template));
}

function deleteTemplate(id) {
  return withStore(STORE_TEMPLATES, 'readwrite', (store) => store.delete(id));
}
