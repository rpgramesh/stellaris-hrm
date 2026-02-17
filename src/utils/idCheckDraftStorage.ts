const DB_NAME = 'stellaris-id-check';
const STORE_NAME = 'employeeDrafts';
const DB_VERSION = 1;

const openDb = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'));
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'employeeId' });
      }
    };
  });
};

export const saveEmployeeDrafts = async (employeeId: string, drafts: any[]): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const value = { employeeId, drafts };
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save drafts'));
  });
};

export const loadEmployeeDrafts = async (employeeId: string): Promise<any[]> => {
  const db = await openDb();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(employeeId);
    request.onsuccess = () => {
      const result = request.result as { employeeId: string; drafts: any[] } | undefined;
      resolve(result?.drafts || []);
    };
    request.onerror = () => reject(request.error || new Error('Failed to load drafts'));
  });
};
