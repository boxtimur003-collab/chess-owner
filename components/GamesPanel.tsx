'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { guestLogin } from '@/lib/authActions';
import { normalizeCode } from '@/lib/code';
import { PAGE, createGame, listInvites, listMyGames, type GameRow } from '@/lib/games';

const STATUS: Record<string, string> = { waiting: 'ожидает', playing: 'идёт', finished: 'окончена' };

export default function GamesPanel() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;
  const [code, setCode] = useState('');
  const [level, setLevel] = useState(3);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [games, setGames] = useState<GameRow[]>([]);
  const [invites, setInvites] = useState<GameRow[]>([]);
  const [hasMore, setHasMore] = useState(false);

  // Один раз при входе: 1 запрос партий (≤20 reads) + 1 запрос приглашений (≤5 reads). Дальше — только вручную.
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const rows = await listMyGames(uid);
      setGames(rows);
      setHasMore(rows.length === PAGE);
      setInvites(await listInvites(uid));
    } catch {
      setErr('Не удалось загрузить список партий (проверьте индекс Firestore — см. README).');
    }
  }, [uid]);
  useEffect(() => { void load(); }, [load]);

  const more = async () => {
    if (!uid || games.length === 0) return;
    const rows = await listMyGames(uid, games[games.length - 1].createdAt);
    setGames((g) => [...g, ...rows]);
    setHasMore(rows.length === PAGE);
  };

  const create = async () => {
    setBusy(true);
    setErr('');
    try {
      await guestLogin();
      router.push(`/game/${await createGame(null)}`);
    } catch {
      setErr('Не удалось создать партию.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const c = normalizeCode(code);
    if (!c) return setErr('Код — 8 символов (буквы и цифры).');
    try { await guestLogin(); } catch { return setErr('Не удалось войти.'); }
    router.push(`/game/${c}`); // страница партии сама присоединит вторым игроком
  };

  return (
    <section className="card col">
      <h2>Игра</h2>
      <button className="btn" disabled={busy} onClick={create}>Создать партию (код приглашения)</button>
      <div className="row">
        <input placeholder="Код партии" value={code} maxLength={8} autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
        <button className="btn" onClick={join}>Войти</button>
      </div>
      <div className="row">
        <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>ИИ: уровень {l}</option>)}
        </select>
        <Link className="btn" href={`/play/ai?level=${level}`}>Играть с ИИ</Link>
      </div>
      {err && <div className="err">{err}</div>}

      {invites.length > 0 && (
        <>
          <h3>Приглашения</h3>
          {invites.map((g) => (
            <Link key={g.id} className="btn" href={`/game/${g.id}`}>Принять приглашение {g.id}</Link>
          ))}
        </>
      )}

      {games.length > 0 && (
        <>
          <h3>Мои партии</h3>
          {games.map((g) => (
            <Link key={g.id} href={`/game/${g.id}`} className="gamerow">
              <span>{g.id}</span>
              <span className="muted">{STATUS[g.status]} · ходов {g.moveCount}</span>
            </Link>
          ))}
          {hasMore && <button className="btn ghost" onClick={more}>Ещё</button>}
        </>
      )}
      {uid && <button className="btn ghost" onClick={() => void load()}>Обновить список</button>}
    </section>
  );
}
