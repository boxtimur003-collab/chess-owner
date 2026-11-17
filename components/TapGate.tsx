'use client';
import { useRef } from 'react';
import { useAuth } from '@/lib/AuthProvider';

/**
 * Невидимая зона 160px. 10 тапов (пауза между тапами ≤ 1.5 с) → POST /api/cheat-gate.
 * Сервер проверяет claim owner в ID-токене: 204 → открываем меню; иначе — полная тишина.
 * Важно: это гейт ДОСТУПА К МЕНЮ. Сам движок работает локально, см. README → «Модель угроз».
 */
export default function TapGate({ onOpen }: { onOpen: () => void }) {
  const { user } = useAuth();
  const count = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const tap = async () => {
    count.current += 1;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (count.current = 0), 1500);
    if (count.current < 10 || !user) return;
    count.current = 0;
    try {
      // forceRefresh=true: только что выданный claim подхватывается без перезахода.
      const token = await user.getIdToken(true);
      const r = await fetch('/api/cheat-gate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 204) onOpen();
    } catch {
      /* тишина */
    }
  };

  return <div onClick={tap} style={{ height: 160, WebkitTapHighlightColor: 'transparent' }} aria-hidden />;
}
