import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError, API_BASE } from '../api/client.js';
import { migrateLocalToRemote, createStorageAdapter } from '../api/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(0);
  // backendAvailable: null = ainda checando, true = OK, false = offline/inalcançável.
  // false ativa modo "standalone-only" (sem auth, sem campanhas) com banner global.
  const [backendAvailable, setBackendAvailable] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.user);
      setBackendAvailable(true);
    } catch (e) {
      if (e instanceof ApiError) {
        // Backend respondeu — está vivo, só não autenticado
        setBackendAvailable(true);
        if (e.status === 401 || e.status === 403) setUser(null);
        else console.warn('auth/me unexpected', e);
      } else {
        // Erro de rede: backend não responde
        console.warn('backend unreachable:', e?.message);
        setBackendAvailable(false);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.csrf().catch(() => {});
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setBackendAvailable(true);
    try {
      const result = await migrateLocalToRemote(createStorageAdapter({ remote: true }));
      if (result.migrated) setMigrated(result.migrated);
    } catch (e) { console.warn('migration failed', e); }
    return res.user;
  }, []);

  const signup = useCallback(async (email, password, displayName) => {
    const res = await api.signup({ email, password, displayName });
    setUser(res.user);
    setBackendAvailable(true);
    try {
      const result = await migrateLocalToRemote(createStorageAdapter({ remote: true }));
      if (result.migrated) setMigrated(result.migrated);
    } catch (e) { console.warn('migration failed', e); }
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* offline ok */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, migrated, backendAvailable, apiBase: API_BASE, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
