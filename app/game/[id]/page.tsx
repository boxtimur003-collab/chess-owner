'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import { useAuth } from '@/lib/AuthProvider';
import { guestLogin } from '@/lib/authActions';
import { acceptGame, pushMove, resign, START_FEN, watchGame, type GameDoc } from '@/lib/games';
import { useTracked, type Mv } from '@/lib/tracked';
import { useCheatSession } from '@/lib/cheatSession';
import { useOwner } from '@/lib/useOwner';
import Board from '@/components/Board';
import { CheatMenu, EvalBadge, useCheat } from '@/components/CheatOverlay';

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id).toUpperCase();
  const { user, loading } = useAuth();
  const uid = user?.uid;
  const { open, setOpen } = useCheatSession();
  const owner = useOwner();

  // undefined = загрузка, null = партия не найдена/нет доступа
  const [g, setG] = useState<GameDoc | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const { pieces, sync } = useTracked(START_FEN);
  const joining = useRef(false);

  // Открыли ссылку без аккаунта → тихо входим гостем.
  useEffect(() => {
    if (!loading && !user) guestLogin().catch(() => setErr('Не удалось войти.'));
  }, [loading, user]);

  // ОДИН listener на ОДИН документ партии.
  useEffect(() => {
    if (!uid) return;
    return watchGame(id, (ng) => { setG(ng); if (ng) sync(ng.fen, ng.lastMove); }, () => setG(null));
  }, [id, uid, sync]);

  // Автоприсоединение вторым игроком (1 write).
  useEffect(() => {
    if (!g || !uid || joining.current) return;
    if (g.status === 'waiting' && g.black === null && g.white !== uid) {
      joining.current = true;
      acceptGame(id, g.white).catch(() => { joining.current = false; setErr('Не удалось присоединиться.'); });
    }
  }, [g, uid, id]);

  const role: 'w' | 'b' | null = g && uid ? (g.white === uid ? 'w' : g.black === uid ? 'b' : null) : null;
  const myTurn = !!g && g.status === 'playing' && role !== null && g.turn === role;
  const cheatOn = open && owner && !!g && g.status === 'playing';
  const cheat = useCheat(g?.fen ?? '', cheatOn);
  const fresh = !!g && cheat.fen === g.fen;

  if (g === undefined) return <main className="page"><p className="muted">Загрузка…</p></main>;
  if (g === null) return <main className="page"><Link href="/">← В лобби</Link><p>Партия не найдена.</p></main>;

  const onMove = async (mv: Mv) => {
    if (role === null) return;
    const chess = new Chess(g.fen);
    let m;
    try { m = chess.move(mv); } catch { return; }
    sync(chess.fen(), mv); // оптимистично: фигура едет сразу
    const result = chess.isCheckmate() ? (m.color === 'w' ? '1-0' : '0-1') : chess.isDraw() ? '1/2' : undefined;
    try {
      await pushMove(id, { fen: chess.fen(), turn: chess.turn(), lastMove: mv, moveCount: g.moveCount + 1, result });
    } catch {
      sync(g.fen, null); // откат
      setErr('Не удалось отправить ход.');
    }
  };

  const status =
    g.status === 'waiting' ? 'Ожидаем соперника'
    : g.status === 'finished' ? `Партия окончена: ${g.result === '1/2' ? 'ничья' : g.result}`
    : role === null ? 'Вы наблюдатель'
    : myTurn ? 'Ваш ход' : 'Ход соперника';

  const link = typeof window === 'undefined' ? '' : `${location.origin}/game/${id}`;

  return (
    <main className="page">
      <div className="row"><Link href="/" className="muted">← Лобби</Link></div>
      <Board
        fen={g.fen}
        pieces={pieces}
        myColor={role ?? 'w'}
        canMove={myTurn}
        onMove={onMove}
        arrow={cheatOn && myTurn && fresh ? cheat.best : null}
        badge={cheatOn && fresh ? <EvalBadge cp={cheat.evalWhite} /> : null}
      />
      <p className="status">{status}</p>
      {g.status === 'waiting' && (
        <div className="card col">
          <div>Код приглашения: <strong>{id}</strong></div>
          <button className="btn" onClick={() => (navigator.share ? navigator.share({ url: link }) : navigator.clipboard?.writeText(link))}>
            Поделиться ссылкой
          </button>
        </div>
      )}
      {g.status === 'playing' && role !== null && (
        <button className="btn ghost" onClick={() => { if (confirm('Сдаться?')) void resign(id, role); }}>Сдаться</button>
      )}
      {err && <div className="err">{err}</div>}
      {cheatOn && fresh && <CheatMenu st={cheat} onClose={() => setOpen(false)} />}
    </main>
  );
}
