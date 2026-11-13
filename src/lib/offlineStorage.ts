import { MenuAppState } from '../types/menu';

const DB_NAME = 'RedLionMenuSyncOfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'menu_state_cache';
const STATE_KEY = 'current_kiosk_state_v2';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMenuStateToIndexedDB(state: MenuAppState): Promise<void> {
  // 1. Save to IndexedDB first (supports large base64 logos & full catalog without 5MB quota limits)
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(state, STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore IDB error and try localStorage
  }

  // 2. Also save to localStorage for synchronous backup
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // If base64 logo exceeds localStorage quota, IndexedDB above already persisted it safely
  }
}

export async function loadMenuStateFromIndexedDB(): Promise<MenuAppState | null> {
  try {
    const db = await openDatabase();
    const idbResult = await new Promise<MenuAppState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve((req.result as MenuAppState) || null);
      req.onerror = () => reject(req.error);
    });
    if (idbResult && idbResult.organization?.branding) {
      return idbResult;
    }
  } catch {
    // Fallback to localStorage
  }

  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MenuAppState;
    return parsed?.organization?.branding ? parsed : null;
  } catch {
    return null;
  }
}
