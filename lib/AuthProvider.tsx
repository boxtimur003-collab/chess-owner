'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { fbAuth } from './firebase';

type AuthCtx = { user: User | null; loading: boolean; isAnonymous: boolean; refresh: () => void };
const Ctx = createContext<AuthCtx>({ user: null, loading: true, isAnonymous: false, refresh: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(fbAuth(), (u) => {
        setUser(u);
        setLoading(false);
      }),
    [],
  );

  // linkWithCredential мутирует тот же объект User (uid не меняется) и onAuthStateChanged не срабатывает —
  // refresh() принудительно пересчитывает isAnonymous.
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const value = useMemo(
    () => ({ user, loading, isAnonymous: user?.isAnonymous ?? false, refresh }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, refresh, tick],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = (): AuthCtx => useContext(Ctx);
