/**
 * Offline Data Persistence Service
 * Utilizes IndexedDB for client-side offline storage of draft reports,
 * session progress, and offline mutation queues with automatic network synchronization.
 */

import { StorageService } from './storage';
import { DailyOperationalReport, DailyReportItem } from '../types';

export interface DraftReportData {
  reportDate: string;
  items: DailyReportItem[];
  quantumCount: string;
  bodyAnalyzerCount: string;
  kitRegisteredCount: number | '';
  kitNumbers: string;
  updatedAt: string;
}

export interface OfflineQueueItem {
  id?: number;
  action: 'SUBMIT_REPORT' | 'UPDATE_REPORT' | 'RESTOCK';
  payload: any;
  timestamp: string;
  synced: boolean;
}

const DB_NAME = 't20_offline_db';
const DB_VERSION = 2;
const STORES = {
  DRAFTS: 'draft_reports',
  SESSION: 'session_progress',
  QUEUE: 'offline_queue',
};

class OfflinePersistenceService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private onlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
      this.setupNetworkListeners();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Draft reports store
        if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
          db.createObjectStore(STORES.DRAFTS, { keyPath: 'reportDate' });
        }

        // Session progress store
        if (!db.objectStoreNames.contains(STORES.SESSION)) {
          db.createObjectStore(STORES.SESSION, { keyPath: 'key' });
        }

        // Offline mutation queue
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          db.createObjectStore(STORES.QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', async () => {
      this.onlineStatus = true;
      window.dispatchEvent(new CustomEvent('t20-network-status', { detail: { online: true } }));
      // Automatically synchronize queued offline actions when network reconnects
      try {
        const syncedCount = await this.syncOfflineQueue();
        if (syncedCount > 0) {
          window.dispatchEvent(
            new CustomEvent('t20-offline-sync-complete', {
              detail: { count: syncedCount, timestamp: new Date().toISOString() },
            })
          );
        }
      } catch (err) {
        console.warn('Auto-sync on reconnect error:', err);
      }
    });

    window.addEventListener('offline', () => {
      this.onlineStatus = false;
      window.dispatchEvent(new CustomEvent('t20-network-status', { detail: { online: false } }));
    });
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return this.onlineStatus;
  }

  /**
   * Save a draft report in IndexedDB as the user enters data
   */
  public async saveDraftReport(draft: DraftReportData): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.DRAFTS, 'readwrite');
        const store = tx.objectStore(STORES.DRAFTS);
        const req = store.put({
          ...draft,
          updatedAt: new Date().toISOString(),
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage if IndexedDB encounters issues
      try {
        localStorage.setItem(`t20_draft_${draft.reportDate}`, JSON.stringify(draft));
      } catch {
        // quota safety
      }
    }
  }

  /**
   * Retrieve a draft report from IndexedDB
   */
  public async getDraftReport(reportDate: string): Promise<DraftReportData | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.DRAFTS, 'readonly');
        const store = tx.objectStore(STORES.DRAFTS);
        const req = store.get(reportDate);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const raw = localStorage.getItem(`t20_draft_${reportDate}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Remove draft report from IndexedDB once submitted or discarded
   */
  public async deleteDraftReport(reportDate: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.DRAFTS, 'readwrite');
        const store = tx.objectStore(STORES.DRAFTS);
        const req = store.delete(reportDate);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        localStorage.removeItem(`t20_draft_${reportDate}`);
      } catch {
        // safety
      }
    }
  }

  /**
   * Cache session progress (e.g. current tab, active filter, scroll position)
   */
  public async saveSessionProgress(key: string, data: any): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SESSION, 'readwrite');
        const store = tx.objectStore(STORES.SESSION);
        const req = store.put({ key, data, updatedAt: new Date().toISOString() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        sessionStorage.setItem(`t20_session_${key}`, JSON.stringify(data));
      } catch {
        // safety
      }
    }
  }

  /**
   * Get cached session progress
   */
  public async getSessionProgress(key: string): Promise<any | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SESSION, 'readonly');
        const store = tx.objectStore(STORES.SESSION);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const raw = sessionStorage.getItem(`t20_session_${key}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Queue an action to be performed when back online
   */
  public async queueOfflineAction(action: OfflineQueueItem['action'], payload: any): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.QUEUE, 'readwrite');
        const store = tx.objectStore(STORES.QUEUE);
        const req = store.add({
          action,
          payload,
          timestamp: new Date().toISOString(),
          synced: false,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Local fallback
    }
  }

  /**
   * Process all queued offline actions when network reconnects
   */
  public async syncOfflineQueue(): Promise<number> {
    try {
      const db = await this.initDB();
      const items: OfflineQueueItem[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.QUEUE, 'readonly');
        const store = tx.objectStore(STORES.QUEUE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const unsynced = items.filter((it) => !it.synced);
      if (unsynced.length === 0) return 0;

      for (const item of unsynced) {
        if (item.action === 'SUBMIT_REPORT' || item.action === 'UPDATE_REPORT') {
          StorageService.saveOrUpdateDailyReport(item.payload);
        }
      }

      // Clear synced items
      const deleteTx = db.transaction(STORES.QUEUE, 'readwrite');
      const deleteStore = deleteTx.objectStore(STORES.QUEUE);
      deleteStore.clear();

      return unsynced.length;
    } catch (err) {
      console.warn('Sync offline queue failed:', err);
      return 0;
    }
  }
}

export const OfflineService = new OfflinePersistenceService();
