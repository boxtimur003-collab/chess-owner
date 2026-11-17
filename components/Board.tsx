'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Chess, type Square } from 'chess.js';
import { Piece } from './Pieces';
import type { Mv, Tracked } from '@/lib/tracked';
import './board.css';

const sqXY = (sq: string, flip: boolean) => {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]) - 1;
  return { x: flip ? 7 - f : f, y: flip ? r : 7 - r };
};

type Props = {
  fen: string;
  pieces: Tracked[];
  myColor: 'w' | 'b';
  canMove: boolean;
  onMove: (m: Mv) => void;
  arrow?: Mv | null;
  badge?: ReactNode;
};

export default function Board({ fen, pieces, myColor, canMove, onMove, arrow, badge }: Props) {
  const flip = myColor === 'b';
  const [sel, setSel] = useState<string | null>(null);
  const game = useMemo(() => new Chess(fen), [fen]);
  // Сброс выделения при смене позиции делаем через key на уровне выбора: цели считаются от текущего game.
  const targets = useMemo(() => (sel ? game.moves({ square: sel as Square, verbose: true }) : []), [sel, game]);

  const click = (sq: string) => {
    if (!canMove) return;
    const t = targets.find((m) => m.to === sq);
    if (t) {
      // Превращение пешки — всегда в ферзя (упрощение: UI выбора фигуры вне объёма v1).
      onMove({ from: t.from, to: t.to, promotion: t.promotion ? 'q' : undefined });
      setSel(null);
      return;
    }
    const p = game.get(sq as Square);
    setSel(p && p.color === myColor && game.turn() === myColor ? sq : null);
  };

  const cells = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8;
    const y = Math.floor(i / 8);
    const sq = String.fromCharCode(97 + (flip ? 7 - x : x)) + (flip ? y + 1 : 8 - y);
    return { sq, dark: (x + y) % 2 === 1 };
  });

  return (
    <div className="board-wrap">
      <div className="board">
        {cells.map(({ sq, dark }) => {
          const t = targets.find((m) => m.to === sq);
          return (
            <div key={sq} className={`cell ${dark ? 'dark' : 'light'}${sel === sq ? ' sel' : ''}`} onClick={() => click(sq)}>
              {t && !t.captured && <span className="dot" />}
              {t && t.captured && <span className="ring" />}
            </div>
          );
        })}
        {pieces.map((p) => {
          const { x, y } = sqXY(p.sq, flip);
          return (
            <div key={p.id} className="piece" style={{ transform: `translate(${x * 100}%, ${y * 100}%)` }} onClick={() => click(p.sq)}>
              <Piece type={p.type} color={p.color} />
            </div>
          );
        })}
        {arrow && (() => {
          const a = sqXY(arrow.from, flip);
          const b = sqXY(arrow.to, flip);
          return (
            <svg className="arrow" viewBox="0 0 8 8" aria-hidden>
              <defs>
                <marker id="ah" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto">
                  <path d="M0 0L4 2L0 4z" fill="#f5c542" />
                </marker>
              </defs>
              <line x1={a.x + 0.5} y1={a.y + 0.5} x2={b.x + 0.5} y2={b.y + 0.5} stroke="#f5c542" strokeWidth=".16" strokeLinecap="round" markerEnd="url(#ah)" />
            </svg>
          );
        })()}
        {badge}
      </div>
    </div>
  );
}
