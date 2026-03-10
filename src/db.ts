import Dexie, { type EntityTable } from 'dexie';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface PatientRec {
    id: string;
    name: string;
    age: number;
    gender: string;
    location: string;
    condition: string;
    status: string;
    risk: 'Low' | 'Moderate' | 'High';
    lastSync: string;
    aiConfidence?: number;
    createdAt: number;
}

export interface DoctorRec {
    id: string;
    name: string;
    department: string;
    email: string;
    password?: string;
    createdAt: number;
}

/** Medical support staff — nurses, lab techs, pharmacists, ward assistants, etc. */
export interface MedicalWorkerRec {
    id: string;           // USR-xxx (mirrors UserRec id)
    name: string;
    designation: string;  // e.g. 'Nurse', 'Lab Technician', 'Pharmacist'
    department: string;
    email: string;
    phone?: string;
    shift: 'Morning' | 'Evening' | 'Night' | 'Rotating';
    createdAt: number;
    createdBy?: string;
}

export interface AuditLogRec {
    id?: number;
    action: string;
    userId: string;
    userName: string;
    role: string;
    details: string;
    timestamp: number;
}

/** Unified user record for authentication (admins + doctors + staff) */
export interface UserRec {
    id: string;
    email: string;
    passwordHash: string;
    salt: string;
    name: string;
    role: 'admin' | 'doctor' | 'staff';
    department?: string;
    designation?: string;
    failedAttempts: number;
    lockedUntil?: number;
    mustChangePassword: boolean;
    createdAt: number;
    createdBy?: string;
}

/** Active session record */
export interface SessionRec {
    token: string;
    userId: string;
    role: 'admin' | 'doctor' | 'staff';
    expiresAt: number;
    createdAt: number;
}

// ── Database ─────────────────────────────────────────────────────────────────

const db = new Dexie('HMSDatabase') as Dexie & {
    patients: EntityTable<PatientRec, 'id'>;
    doctors: EntityTable<DoctorRec, 'id'>;
    auditLogs: EntityTable<AuditLogRec, 'id'>;
    users: EntityTable<UserRec, 'id'>;
    sessions: EntityTable<SessionRec, 'token'>;
    medicalWorkers: EntityTable<MedicalWorkerRec, 'id'>;
};

db.version(1).stores({
    patients: 'id, name, risk, createdAt',
    doctors: 'id, email, department, createdAt',
    auditLogs: '++id, action, userId, timestamp',
});

db.version(2).stores({
    patients: 'id, name, risk, createdAt',
    doctors: 'id, email, department, createdAt',
    auditLogs: '++id, action, userId, timestamp',
    users: 'id, email, role, createdAt',
    sessions: 'token, userId, expiresAt',
});

// Version 3 — adds medical workers table
db.version(3).stores({
    patients: 'id, name, risk, createdAt',
    doctors: 'id, email, department, createdAt',
    auditLogs: '++id, action, userId, timestamp',
    users: 'id, email, role, createdAt',
    sessions: 'token, userId, expiresAt',
    medicalWorkers: 'id, email, department, designation, createdAt',
});



// ── Web Crypto Helpers ────────────────────────────────────────────────────────

/** Generate a cryptographically random hex string of byteLength bytes */
export function generateHex(byteLength = 16): string {
    const arr = new Uint8Array(byteLength);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Derive a PBKDF2 hash from a password and hex salt → returns hex string */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const salt = hexToBuffer(saltHex);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200_000 },
        keyMaterial,
        256
    );

    return bufferToHex(bits);
}

/** Verify a plaintext password against a stored PBKDF2 hash */
export async function verifyPassword(password: string, saltHex: string, storedHash: string): Promise<boolean> {
    const derived = await hashPassword(password, saltHex);
    return derived === storedHash;
}

function hexToBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ── User Helpers ──────────────────────────────────────────────────────────────

/** Create a new user with a hashed password. Returns the UserRec. */
export async function createUser(
    email: string,
    plainPassword: string,
    name: string,
    role: 'admin' | 'doctor',
    options: { department?: string; createdBy?: string; mustChangePassword?: boolean } = {}
): Promise<UserRec> {
    const salt = generateHex(16);
    const passwordHash = await hashPassword(plainPassword, salt);
    const id = `USR-${generateHex(5).toUpperCase()}`;

    const user: UserRec = {
        id,
        email: email.toLowerCase().trim(),
        passwordHash,
        salt,
        name,
        role,
        department: options.department,
        failedAttempts: 0,
        mustChangePassword: options.mustChangePassword ?? false,
        createdAt: Date.now(),
        createdBy: options.createdBy,
    };

    await db.users.add(user);
    return user;
}

/** Get user by email (case-insensitive) */
export async function getUserByEmail(email: string): Promise<UserRec | undefined> {
    return db.users.where('email').equals(email.toLowerCase().trim()).first();
}

// ── Session Helpers ───────────────────────────────────────────────────────────

const SESSION_TTL_SHORT = 60 * 60 * 1000;          // 1 hour
const SESSION_TTL_LONG = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Create a session token for a user. Returns the token string. */
export async function createSession(
    userId: string,
    role: 'admin' | 'doctor' | 'staff',
    rememberMe: boolean
): Promise<string> {
    // Purge old sessions for this user
    await db.sessions.where('userId').equals(userId).delete();

    const token = generateHex(32);
    const ttl = rememberMe ? SESSION_TTL_LONG : SESSION_TTL_SHORT;
    await db.sessions.add({
        token,
        userId,
        role,
        expiresAt: Date.now() + ttl,
        createdAt: Date.now(),
    });
    return token;
}

/** Validate a token. Returns the session if valid, undefined if expired/missing. */
export async function validateSession(token: string): Promise<SessionRec | undefined> {
    const session = await db.sessions.get(token);
    if (!session) return undefined;
    if (session.expiresAt < Date.now()) {
        await db.sessions.delete(token);
        return undefined;
    }
    return session;
}

/** Delete a session (logout) */
export async function deleteSession(token: string): Promise<void> {
    await db.sessions.delete(token);
}

// ── Audit Log Helper ──────────────────────────────────────────────────────────

export const logAuditLog = async (
    action: string,
    userId: string,
    userName: string,
    role: string,
    details: string
): Promise<void> => {
    try {
        await db.auditLogs.add({ action, userId, userName, role, details, timestamp: Date.now() });
    } catch (error) {
        console.error('Failed to write audit log', error);
    }
};

// ── Seed Admins on First Launch ───────────────────────────────────────────────

const DEFAULT_ADMINS = [
    { email: 'admin@hms.local', password: 'Admin@123', name: 'System Administrator' },
    { email: 'admin2@hms.local', password: 'Admin@456', name: 'Secondary Admin' },
];

export async function seedAdmins(): Promise<void> {
    const existingAdmins = await db.users.where('role').equals('admin').count();
    if (existingAdmins > 0) return; // already seeded

    for (const a of DEFAULT_ADMINS) {
        await createUser(a.email, a.password, a.name, 'admin');
    }
    console.info('[HMS] Admin accounts seeded.');
}

export default db;
