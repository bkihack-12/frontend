import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DemoUser, SessionUser } from '../types';
import { KEYS, loadJson, removeKey, saveJson } from '../lib/storage';

/**
 * PROTOTYPOWE konto demo.
 * Dane (w tym zahaszowane hasło) trzymane są lokalnie w AsyncStorage. Hash poniżej NIE jest
 * kryptograficznie bezpieczny — to tylko po to, by nie trzymać hasła jawnym tekstem w demie.
 * Nie używać w produkcji.
 */
function demoHash(input: string): string {
  // cyrb53 (non-cryptographic)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export const DEMO_ACCOUNT = { name: 'Ania Demo', email: 'demo@nasztorun.pl', password: 'demo123' };

export type AuthMode = 'login' | 'register' | 'account';
interface AuthSheetState {
  mode: AuthMode;
  reason?: string;
}

type Result = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  user: SessionUser | null;
  ready: boolean;
  register: (input: { name: string; email: string; password: string }) => Promise<Result>;
  login: (input: { email: string; password: string }) => Promise<Result>;
  loginDemo: () => Promise<Result>;
  logout: () => Promise<void>;
  sheet: AuthSheetState | null;
  openAuth: (mode: AuthMode, reason?: string) => void;
  closeAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toSession = (u: DemoUser): SessionUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  createdAt: u.createdAt,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<AuthSheetState | null>(null);

  useEffect(() => {
    (async () => {
      const session = await loadJson<SessionUser | null>(KEYS.session, null);
      if (session) {
        // make sure the account still exists
        const users = await loadJson<DemoUser[]>(KEYS.users, []);
        const found = users.find((u) => u.id === session.id);
        if (found) setUser(toSession(found));
        else await removeKey(KEYS.session);
      }
      setReady(true);
    })();
  }, []);

  const startSession = useCallback(async (u: DemoUser) => {
    const session = toSession(u);
    setUser(session);
    await saveJson(KEYS.session, session);
  }, []);

  const register = useCallback<AuthContextValue['register']>(
    async ({ name, email, password }) => {
      await new Promise((r) => setTimeout(r, 500)); // simulated latency
      const users = await loadJson<DemoUser[]>(KEYS.users, []);
      const normalized = email.trim().toLowerCase();
      if (users.some((u) => u.email === normalized)) {
        return { ok: false, error: 'Konto z tym adresem e-mail już istnieje. Zaloguj się.' };
      }
      const created: DemoUser = {
        id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        email: normalized,
        passwordHash: demoHash(password),
        createdAt: new Date().toISOString(),
      };
      await saveJson(KEYS.users, [...users, created]);
      await startSession(created);
      return { ok: true };
    },
    [startSession],
  );

  const login = useCallback<AuthContextValue['login']>(
    async ({ email, password }) => {
      await new Promise((r) => setTimeout(r, 500));
      const users = await loadJson<DemoUser[]>(KEYS.users, []);
      const found = users.find((u) => u.email === email.trim().toLowerCase());
      if (!found || found.passwordHash !== demoHash(password)) {
        return { ok: false, error: 'Nieprawidłowy e-mail lub hasło.' };
      }
      await startSession(found);
      return { ok: true };
    },
    [startSession],
  );

  const loginDemo = useCallback<AuthContextValue['loginDemo']>(async () => {
    const users = await loadJson<DemoUser[]>(KEYS.users, []);
    let demo = users.find((u) => u.email === DEMO_ACCOUNT.email);
    if (!demo) {
      demo = {
        id: 'u-demo',
        name: DEMO_ACCOUNT.name,
        email: DEMO_ACCOUNT.email,
        passwordHash: demoHash(DEMO_ACCOUNT.password),
        createdAt: new Date().toISOString(),
      };
      await saveJson(KEYS.users, [...users, demo]);
    }
    await startSession(demo);
    return { ok: true };
  }, [startSession]);

  const logout = useCallback(async () => {
    setUser(null);
    await removeKey(KEYS.session);
  }, []);

  const openAuth = useCallback((mode: AuthMode, reason?: string) => setSheet({ mode, reason }), []);
  const closeAuth = useCallback(() => setSheet(null), []);

  const value = useMemo(
    () => ({ user, ready, register, login, loginDemo, logout, sheet, openAuth, closeAuth }),
    [user, ready, register, login, loginDemo, logout, sheet, openAuth, closeAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

