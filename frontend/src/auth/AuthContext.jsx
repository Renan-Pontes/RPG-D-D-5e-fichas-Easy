import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../api/client.js';
import { migrateLocalToRemote, createStorageAdapter } from '../api/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else console.warn('auth/me failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    try {
      const result = await migrateLocalToRemote(createStorageAdapter({ remote: true }));
      if (result.migrated) setMigrated(result.migrated);
    } catch (e) { console.warn('migration failed', e); }
    return res.user;
  }, []);

  const signup = useCallback(async (email, password, displayName) => {
    const res = await api.signup({ email, password, displayName });
    setUser(res.user);
    try {
      const result = await migrateLocalToRemote(createStorageAdapter({ remote: true }));
      if (result.migrated) setMigrated(result.migrated);
    } catch (e) { console.warn('migration failed', e); }
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, migrated, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
