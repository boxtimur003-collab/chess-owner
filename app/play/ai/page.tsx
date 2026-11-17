'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import Board from '@/components/Board';
import { CheatMenu, EvalBadge, useCheat } from '@/components/CheatOverlay';
import { aiMove } from '@/lib/engine/engine';
import { START_FEN } from '@/lib/games';
import { useTracked, type Mv } from '@/lib/tracked';
import { useCheatSession } from '@/lib/cheatSession';
import { useOwner } from '@/lib/useOwner';

function AiGame() {
  const sp = useSearchParams();
  const level = Math.min(5, Math.max(1, Number(sp.get('level')) || 3));
  const { open, setOpen } = useCheatSession();
  const owner = useOwner();
  const [human, setHuman] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(START_FEN);
  const { pieces, sync } = useTracked(START_FEN);
  const [thinking, setThinking] = useState(false);

  const game = useMemo(() => new Chess(fen), [fen]);
  const over = game.isGameOver();

  // Ход ИИ. Эффект перезапускается при смене позиции; cleanup отменяет устаревший результат.
  useEffect(() => {
    if (over || game.turn() === human) return;
    let alive = true;
    setThinking(true);
    const t = setTimeout(async () => {
      const mv = await aiMove(fen, level);
      if (!alive) return;
      setThinking(false);
      if (!mv) return;
      const m: Mv = { from: mv.from, to: mv.to, promotion: mv.promotion };
      const c = new Chess(fen);
      c.move(m);
      sync(c.fen(), m);
      setFen(c.fen());
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [fen, level, human, over, game, sync]);

  const onMove = (mv: Mv) => {
    const c = new Chess(fen);
    try { c.move(mv); } catch { return; }
    sync(c.fen(), mv);
    setFen(c.fen());
  };

  const restart = (side: 'w' | 'b') => {
    setHuman(side);
    setThinking(false);
    setFen(START_FEN);
    sync(START_FEN, null);
  };

  const myTurn = !over && game.turn() === human;
  const cheatOn = open && owner && myTurn;
  const cheat = useCheat(fen, cheatOn);
  const fresh = cheat.fen === fen;

  const status = game.isCheckmate()
    ? `Мат. Победили ${game.turn() === 'w' ? 'чёрные' : 'белые'}`
    : over ? 'Ничья'
    : thinking ? 'ИИ думает…' : myTurn ? 'Ваш ход' : '';

  return (
    <main className="page">
      <div className="row"><Link href="/" className="muted">← Лобби</Link><span className="muted">ИИ: уровень {level}</span></div>
      <Board
        fen={fen}
        pieces={pieces}
        myColor={human}
        canMove={myTurn}
        onMove={onMove}
        arrow={cheatOn && fresh ? cheat.best : null}
        badge={cheatOn && fresh ? <EvalBadge cp={cheat.evalWhite} /> : null}
      />
      <p className="status">{status}</p>
      <div className="row">
        <button className="btn" onClick={() => restart('w')}>Новая партия (белые)</button>
        <button className="btn ghost" onClick={() => restart('b')}>За чёрных</button>
      </div>
      {cheatOn && fresh && <CheatMenu st={cheat} onClose={() => setOpen(false)} />}
    </main>
  );
}

// useSearchParams требует Suspense-границу при статической генерации.
export default function AiPage() {
  return <Suspense fallback={null}><AiGame /></Suspense>;
}
