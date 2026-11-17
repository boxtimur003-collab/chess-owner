'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { analyze, type Scored } from '@/lib/engine/engine';
import { useAuth } from '@/lib/AuthProvider';

export type CheatState = { fen: string; best: Scored | null; evalWhite: number; list: Scored[] };
const EMPTY: CheatState = { fen: '', best: null, evalWhite: 0, list: [] };

/**
 * Считает top-10 ходов ТОЛЬКО при enabled === true. Дебаунс 250 мс: при быстрой смене позиции
 * движок не запускается на промежуточных FEN. Результат помечен FEN-ом — UI не показывает
 * стрелку от устаревшей позиции.
 */
export function useCheat(fen: string, enabled: boolean): CheatState {
  const [st, setSt] = useState<CheatState>(EMPTY);
  useEffect(() => {
    if (!enabled || !fen) {
      setSt(EMPTY);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      analyze(fen, { depth: 3, k: 10, ms: 1500 }).then((list) => {
        if (!alive) return;
        if (list.length === 0) return setSt(EMPTY);
        const whiteToMove = fen.split(' ')[1] === 'w';
        setSt({ fen, best: list[0], list, evalWhite: (whiteToMove ? 1 : -1) * list[0].cp });
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [fen, enabled]);
  return st;
}

const fmt = (cp: number): string =>
  Math.abs(cp) > 50000 ? (cp > 0 ? '#' : '-#') : (cp > 0 ? '+' : '') + (cp / 100).toFixed(2);

export function EvalBadge({ cp }: { cp: number }) {
  return <div className="eval-badge">{fmt(cp)}</div>;
}

export function CheatMenu({ st, onClose }: { st: CheatState; onClose: () => void }) {
  return (
    <div className="cheat-sheet">
      <header>
        <strong>Оценка (за белых): {fmt(st.evalWhite)}</strong>
        <button className="btn ghost" onClick={onClose} aria-label="Закрыть">×</button>
      </header>
      <ol>
        {st.list.map((m) => (
          <li key={m.from + m.to + (m.promotion ?? '')}>{m.san}<i>{fmt(m.cp)}</i></li>
        ))}
      </ol>
    </div>
  );
}

/** Оверлей на странице «О приложении» после успешных 10 тапов. */
export function OwnerOverlay({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const isSuper = !!user && user.uid === process.env.NEXT_PUBLIC_SUPER_OWNER_UID;
  return (
    <div className="cheat-sheet">
      <header>
        <strong>Режим включён</strong>
        <button className="btn ghost" onClick={onClose}>Выключить</button>
      </header>
      <p className="muted">Подсказки появятся в партиях на этом устройстве.</p>
      {isSuper && <Link href="/super" className="btn">Меню супер-овнера</Link>}
    </div>
  );
}
