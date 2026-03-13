// ── Sync Manager — Push/Pull with Main HMS via REST API ───────────────────────
import axios from 'axios';
import {
  getSyncQueue,
  removeSyncItem,
  getAllPatients,
  updatePatient,
  getLastSync,
  setLastSync,
} from '../database/db';
import { MobilePatient } from '../database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_KEY = 'hms_sync_server_url';
export const DEFAULT_SERVER_URL = 'http://192.168.1.100:3001'; // user can change in Settings

export async function getSyncServerUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(CONFIG_KEY);
  return stored || DEFAULT_SERVER_URL;
}

export async function setSyncServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, url.trim());
}

export type SyncState = {
  isRunning: boolean;
  lastSyncTime: number;
  pendingCount: number;
  lastError: string | null;
  status: 'idle' | 'pushing' | 'pulling' | 'done' | 'error';
};

// ── Pull — get changes from main HMS since last sync ──────────────────────────

export async function pullFromServer(): Promise<{ added: number; updated: number }> {
  const url = await getSyncServerUrl();
  const lastSync = await getLastSync();

  const response = await axios.get(`${url}/api/sync/pull`, {
    params: { since: lastSync },
    timeout: 10000,
  });

  const { patients }: { patients: MobilePatient[] } = response.data;

  const existing = await getAllPatients();
  const existingMap = new Map(existing.map(p => [p.id, p]));

  let added = 0; let updated = 0;
  const { saveAll } = await import('../database/db');

  for (const p of patients) {
    if (existingMap.has(p.id)) {
      // Update only if server version is newer
      const local = existingMap.get(p.id)!;
      if (p.updatedAt > local.updatedAt && local.syncStatus !== 'pending') {
        existingMap.set(p.id, { ...p, syncStatus: 'synced' });
        updated++;
      }
    } else {
      existingMap.set(p.id, { ...p, syncStatus: 'synced' });
      added++;
    }
  }

  const { default: AsyncStorage2 } = await import('@react-native-async-storage/async-storage');
  const { DB_KEYS } = await import('../database/schema');
  await AsyncStorage2.setItem(DB_KEYS.PATIENTS, JSON.stringify(Array.from(existingMap.values())));

  return { added, updated };
}

// ── Push — send pending local changes to main HMS ────────────────────────────

export async function pushToServer(): Promise<{ pushed: number; failed: number }> {
  const url = await getSyncServerUrl();
  const queue = await getSyncQueue();

  let pushed = 0; let failed = 0;

  for (const item of queue) {
    try {
      await axios.post(`${url}/api/sync/push`, {
        operation: item.operation,
        table: item.table,
        recordId: item.recordId,
        payload: JSON.parse(item.payload),
      }, { timeout: 8000 });

      await removeSyncItem(item.id);
      // Mark local record as synced
      if (item.table === 'patients' && item.operation !== 'delete') {
        await updatePatient(item.recordId, { syncStatus: 'synced', lastSync: new Date().toISOString() });
      }
      pushed++;
    } catch {
      failed++;
      console.warn(`[Sync] Failed to push item ${item.id}`);
    }
  }

  return { pushed, failed };
}

// ── Full Sync Cycle ───────────────────────────────────────────────────────────

export async function runFullSync(): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}> {
  try {
    const pushResult = await pushToServer();
    const pullResult = await pullFromServer();
    await setLastSync(Date.now());
    return {
      success: true,
      pushed: pushResult.pushed,
      pulled: pullResult.added + pullResult.updated,
    };
  } catch (err: any) {
    return { success: false, pushed: 0, pulled: 0, error: err.message || 'Sync failed' };
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}
