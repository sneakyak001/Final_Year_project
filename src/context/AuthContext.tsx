import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
    getUserByEmail,
    verifyPassword,
    createSession,
    validateSession,
    deleteSession,
    logAuditLog,
    seedAdmins,
    type UserRec,
} from '../db';
import db from '../db';

export type Role = 'admin' | 'doctor' | 'staff';

export interface User {
    id: string;
    name: string;
    role: Role;
    email: string;
    department?: string;
    designation?: string;
}

export interface LoginResult {
    success: boolean;
    error?: 'invalid_credentials' | 'account_locked' | 'server_error';
    lockedUntil?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    isLoading: boolean;
    login: (email: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
    logout: () => Promise<void>;
    changePassword: (userId: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_TOKEN_KEY = 'hms_session_token';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ── On mount: seed admins + restore session ──────────────────────────────
    useEffect(() => {
        async function init() {
            try {
                await seedAdmins();

                const token = localStorage.getItem(SESSION_TOKEN_KEY);
                if (token) {
                    const session = await validateSession(token);
                    if (session) {
                        const userRec = await db.users.get(session.userId);
                        if (userRec) {
                            setUser(toUser(userRec));
                        } else {
                            // User deleted — clear stale token
                            localStorage.removeItem(SESSION_TOKEN_KEY);
                        }
                    } else {
                        // Token expired or missing
                        localStorage.removeItem(SESSION_TOKEN_KEY);
                    }
                }
            } catch (err) {
                console.error('[HMS Auth] Init error:', err);
            } finally {
                setIsLoading(false);
            }
        }
        init();
    }, []);

    // ── Login ────────────────────────────────────────────────────────────────
    const login = useCallback(async (
        email: string,
        password: string,
        rememberMe: boolean
    ): Promise<LoginResult> => {
        try {
            const userRec = await getUserByEmail(email);

            if (!userRec) {
                return { success: false, error: 'invalid_credentials' };
            }

            // Check lockout
            if (userRec.lockedUntil && userRec.lockedUntil > Date.now()) {
                return { success: false, error: 'account_locked', lockedUntil: userRec.lockedUntil };
            }

            // Verify password
            const isValid = await verifyPassword(password, userRec.salt, userRec.passwordHash);

            if (!isValid) {
                const newAttempts = userRec.failedAttempts + 1;
                const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

                await db.users.update(userRec.id, {
                    failedAttempts: newAttempts,
                    ...(shouldLock ? { lockedUntil: Date.now() + LOCKOUT_DURATION_MS } : {})
                });

                if (shouldLock) {
                    await logAuditLog('Account Locked', userRec.id, userRec.name, userRec.role,
                        `Account locked after ${MAX_FAILED_ATTEMPTS} failed login attempts.`);
                    return { success: false, error: 'account_locked', lockedUntil: Date.now() + LOCKOUT_DURATION_MS };
                }

                return { success: false, error: 'invalid_credentials' };
            }

            // Success — reset failed attempts
            await db.users.update(userRec.id, {
                failedAttempts: 0,
                lockedUntil: undefined,
            });

            // Create session
            const token = await createSession(userRec.id, userRec.role, rememberMe);
            localStorage.setItem(SESSION_TOKEN_KEY, token);

            const sessionUser = toUser(userRec);
            setUser(sessionUser);

            await logAuditLog('User Login', userRec.id, userRec.name, userRec.role,
                `Logged in successfully. RememberMe=${rememberMe}`);

            return { success: true };
        } catch (err) {
            console.error('[HMS Auth] Login error:', err);
            return { success: false, error: 'server_error' };
        }
    }, []);

    // ── Logout ───────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        const token = localStorage.getItem(SESSION_TOKEN_KEY);

        if (user && token) {
            try {
                await logAuditLog('User Logout', user.id, user.name, user.role,
                    `${user.role === 'admin' ? 'Admin' : 'Doctor'} logged out.`);
                await deleteSession(token);
            } catch (err) {
                console.warn('[HMS Auth] Logout cleanup error:', err);
            }
        }

        setUser(null);
        localStorage.removeItem(SESSION_TOKEN_KEY);
    }, [user]);

    // ── Change Password ──────────────────────────────────────────────────────
    const changePassword = useCallback(async (userId: string, newPassword: string) => {
        const { generateHex, hashPassword } = await import('../db');
        const salt = generateHex(16);
        const passwordHash = await hashPassword(newPassword, salt);
        await db.users.update(userId, { salt, passwordHash, mustChangePassword: false });
        await logAuditLog('Password Changed', userId, 'System', 'system', 'User changed their password.');
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isAdmin: user?.role === 'admin',
            isStaff: user?.role === 'staff',
            isLoading,
            login,
            logout,
            changePassword,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toUser(rec: UserRec): User {
    return {
        id: rec.id,
        name: rec.name,
        role: rec.role,
        email: rec.email,
        department: rec.department,
        designation: rec.designation,
    };
}
