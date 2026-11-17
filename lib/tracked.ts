// Фигуры со стабильными id: нужны, чтобы CSS-transition анимировал перемещение (а не пересоздавал DOM).
import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';

export type Mv = { from: string; to: string; promotion?: string };
export type Tracked = { id: number; type: string; color: 'w' | 'b'; sq: string };

export function fromFen(fen: string): Tracked[] {
  let id = 0;
  const out: Tracked[] = [];
  for (const row of new Chess(fen).board())
    for (const c of row) if (c) out.push({ id: id++, type: c.type, color: c.color, sq: c.square });
  return out;
}

/** Применяет ход к набору фигур. Бросает исключение при нелегальном ходе. */
export function applyMove(prev: Tracked[], fenBefore: string, mv: Mv): { pieces: Tracked[]; fen: string } {
  const g = new Chess(fenBefore);
  const m = g.move(mv);
  const rank = m.from[1];
  const capturedSq = m.flags.includes('e') ? m.to[0] + rank : m.to; // en passant
  let next = prev.filter((p) => p.sq !== capturedSq);
  next = next.map((p) => (p.sq === m.from ? { ...p, sq: m.to, type: m.promotion ?? p.type } : p));
  if (m.flags.includes('k')) next = next.map((p) => (p.sq === 'h' + rank ? { ...p, sq: 'f' + rank } : p));
  if (m.flags.includes('q')) next = next.map((p) => (p.sq === 'a' + rank ? { ...p, sq: 'd' + rank } : p));
  return { pieces: next, fen: g.fen() };
}

/**
 * Хранит фигуры и синхронизирует их с FEN. Если ход применился и FEN совпал — анимация;
 * иначе (первая загрузка, пропущенные ходы, откат) — аккуратная пересборка без анимации.
 * Повторный вызов с тем же FEN (эхо собственной записи в Firestore) — no-op.
 */
export function useTracked(startFen: string) {
  const [initial] = useState(() => fromFen(startFen));
  const piecesRef = useRef<Tracked[]>(initial);
  const fenRef = useRef(startFen);
  const [pieces, setPieces] = useState<Tracked[]>(initial);

  const sync = useCallback((fen: string, mv?: Mv | null) => {
    if (fen === fenRef.current) return;
    let next: Tracked[] | null = null;
    if (mv) {
      try {
        const r = applyMove(piecesRef.current, fenRef.current, mv);
        if (r.fen === fen) next = r.pieces;
      } catch {
        /* рассинхрон — пересоберём ниже */
      }
    }
    piecesRef.current = next ?? fromFen(fen);
    fenRef.current = fen;
    setPieces(piecesRef.current);
  }, []);

  return { pieces, sync };
}
