'use client';
// Состояние «чит-режим включён» живёт ТОЛЬКО в памяти React (ни Firestore, ни localStorage):
// соперник его не увидит, а при перезапуске приложения режим выключается.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Session = { open: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<Session | null>(null);

export function CheatSessionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCheatSession(): Session {
  const c = useContext(Ctx);
  if (!c) throw new Error('CheatSessionProvider is missing in the tree');
  return c;
}
