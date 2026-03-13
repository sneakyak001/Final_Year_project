import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DB_KEYS,
  MobilePatient,
  MobileDiagnosis,
  MobileUser,
  SyncQueueItem,
} from './schema';

// ── Generic helpers ──────────────────────────────────────────────────────────

async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

async function saveAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

function generateId(prefix: string): string {
  const hex = Math.random().toString(16).substring(2, 12).toUpperCase();
  return `${prefix}-${hex}`;
}

// ── Patient CRUD ──────────────────────────────────────────────────────────────

export async function getAllPatients(): Promise<MobilePatient[]> {
  return getAll<MobilePatient>(DB_KEYS.PATIENTS);
}

export async function getPatientById(id: string): Promise<MobilePatient | undefined> {
  const all = await getAllPatients();
  return all.find(p => p.id === id);
}

export async function addPatient(data: Omit<MobilePatient, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'lastSync'>): Promise<MobilePatient> {
  const all = await getAllPatients();
  const patient: MobilePatient = {
    ...data,
    id: generateId('PAT'),
    syncStatus: 'pending',
    lastSync: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveAll(DB_KEYS.PATIENTS, [...all, patient]);
  await queueSync('create', 'patients', patient.id, patient);
  return patient;
}

export async function updatePatient(id: string, data: Partial<MobilePatient>): Promise<void> {
  const all = await getAllPatients();
  const updated = all.map(p =>
    p.id === id ? { ...p, ...data, updatedAt: Date.now(), syncStatus: 'pending' as const } : p
  );
  await saveAll(DB_KEYS.PATIENTS, updated);
  const patient = updated.find(p => p.id === id);
  if (patient) await queueSync('update', 'patients', id, patient);
}

export async function deletePatient(id: string): Promise<void> {
  const all = await getAllPatients();
  await saveAll(DB_KEYS.PATIENTS, all.filter(p => p.id !== id));
  await queueSync('delete', 'patients', id, { id });
}

// ── Diagnosis CRUD ────────────────────────────────────────────────────────────

export async function getAllDiagnoses(): Promise<MobileDiagnosis[]> {
  return getAll<MobileDiagnosis>(DB_KEYS.DIAGNOSES);
}

export async function getDiagnosesByPatient(patientId: string): Promise<MobileDiagnosis[]> {
  const all = await getAllDiagnoses();
  return all.filter(d => d.patientId === patientId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addDiagnosis(data: Omit<MobileDiagnosis, 'id' | 'createdAt' | 'synced'>): Promise<MobileDiagnosis> {
  const all = await getAllDiagnoses();
  const diag: MobileDiagnosis = {
    ...data,
    id: generateId('DX'),
    createdAt: Date.now(),
    synced: false,
  };
  await saveAll(DB_KEYS.DIAGNOSES, [...all, diag]);
  await queueSync('create', 'diagnoses', diag.id, diag);
  return diag;
}

// ── User (Local Auth) ─────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<MobileUser[]> {
  return getAll<MobileUser>(DB_KEYS.USERS);
}

export async function getUserByEmail(email: string): Promise<MobileUser | undefined> {
  const all = await getAllUsers();
  return all.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
}

export async function seedDefaultUsers(): Promise<void> {
  const existing = await getAllUsers();
  if (existing.length > 0) return;

  // Import crypto helper
  const { hashPassword, generateHex } = await import('../utils/crypto');

  const defaults = [
    { email: 'admin@hms.local', password: 'Admin@123', name: 'System Admin', role: 'admin' as const },
    { email: 'doctor@hms.local', password: 'Doctor@123', name: 'Dr. Demo User', role: 'doctor' as const, department: 'General' },
    { email: 'staff@hms.local', password: 'Staff@123', name: 'Staff User', role: 'staff' as const },
  ];

  const users: MobileUser[] = [];
  for (const d of defaults) {
    const salt = generateHex(16);
    const passwordHash = await hashPassword(d.password, salt);
    users.push({
      id: generateId('USR'),
      email: d.email,
      passwordHash,
      salt,
      name: d.name,
      role: d.role,
      department: (d as any).department,
      createdAt: Date.now(),
    });
  }
  await saveAll(DB_KEYS.USERS, users);
}

// ── Sync Queue ────────────────────────────────────────────────────────────────

export async function queueSync(
  operation: SyncQueueItem['operation'],
  table: SyncQueueItem['table'],
  recordId: string,
  payload: unknown
): Promise<void> {
  const all = await getAll<SyncQueueItem>(DB_KEYS.SYNC_QUEUE);
  const item: SyncQueueItem = {
    id: generateId('SQ'),
    operation,
    table,
    recordId,
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
    retries: 0,
  };
  await saveAll(DB_KEYS.SYNC_QUEUE, [...all, item]);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAll<SyncQueueItem>(DB_KEYS.SYNC_QUEUE);
}

export async function removeSyncItem(id: string): Promise<void> {
  const all = await getAll<SyncQueueItem>(DB_KEYS.SYNC_QUEUE);
  await saveAll(DB_KEYS.SYNC_QUEUE, all.filter(i => i.id !== id));
}

export async function getLastSync(): Promise<number> {
  const raw = await AsyncStorage.getItem(DB_KEYS.LAST_SYNC);
  return raw ? parseInt(raw) : 0;
}

export async function setLastSync(ts: number): Promise<void> {
  await AsyncStorage.setItem(DB_KEYS.LAST_SYNC, ts.toString());
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function saveSession(userId: string, role: string, name: string): Promise<void> {
  await AsyncStorage.setItem(DB_KEYS.SESSION, JSON.stringify({ userId, role, name, createdAt: Date.now() }));
}

export async function getSession(): Promise<{ userId: string; role: string; name: string } | null> {
  const raw = await AsyncStorage.getItem(DB_KEYS.SESSION);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(DB_KEYS.SESSION);
}
