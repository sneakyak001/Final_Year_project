import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserByEmail, saveSession, getSession, clearSession, seedDefaultUsers } from '../database/db';
import { verifyPassword } from '../utils/crypto';
import { MobileUser } from '../database/schema';

interface AuthContextType {
  user: Omit<MobileUser, 'passwordHash' | 'salt'> | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Omit<MobileUser, 'passwordHash' | 'salt'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await seedDefaultUsers();
        const session = await getSession();
        if (session) {
          const dbUser = await getUserByEmail(
            (await import('../database/db').then(m => m.getAllUsers()))
              .find(u => u.id === session.userId)?.email || ''
          );
          if (dbUser) {
            const { passwordHash, salt, ...safe } = dbUser;
            setUser(safe);
          }
        }
      } catch (e) {
        console.error('[Auth] Init error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const dbUser = await getUserByEmail(email);
      if (!dbUser) return { success: false, error: 'User not found. Check your email.' };

      const valid = await verifyPassword(password, dbUser.salt, dbUser.passwordHash);
      if (!valid) return { success: false, error: 'Incorrect password.' };

      await saveSession(dbUser.id, dbUser.role, dbUser.name);
      const { passwordHash, salt, ...safe } = dbUser;
      setUser(safe);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
