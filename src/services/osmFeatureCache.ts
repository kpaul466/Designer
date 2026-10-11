export interface CachedOSMElement {
  id?: number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: {
    name?: string;
    highway?: string;
    shop?: string;
    amenity?: string;
    building?: string;
    office?: string;
    tourism?: string;
    leisure?: string;
    place?: string;
    waterway?: string;
  };
}

interface OSMCacheRecord {
  key: string;
  fetchedAt: number;
  elements: CachedOSMElement[];
}

const DATABASE_NAME = 'powerline-designer-osm';
const DATABASE_VERSION = 1;
const STORE_NAME = 'feature-areas';
let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support persistent map data.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(request.error || new Error('Could not open the local map data database.'));
      };
      request.onblocked = () => {
        databasePromise = null;
        reject(new Error('The local map data database is blocked by another browser tab.'));
      };
    });
  }

  return databasePromise;
}

export async function readOSMFeatureCache(key: string): Promise<CachedOSMElement[] | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key) as IDBRequest<OSMCacheRecord | undefined>;
    request.onsuccess = () => resolve(request.result?.elements ?? null);
    request.onerror = () => reject(request.error || new Error('Could not read cached map features.'));
  });
}

export async function writeOSMFeatureCache(
  key: string,
  elements: CachedOSMElement[]
): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      key,
      fetchedAt: Date.now(),
      elements,
    } satisfies OSMCacheRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error('Could not save map features to the local database.'));
    transaction.onabort = () =>
      reject(transaction.error || new Error('Saving map features to the local database was aborted.'));
  });
}
