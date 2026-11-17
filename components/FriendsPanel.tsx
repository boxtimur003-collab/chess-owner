'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { addFriendByCode, listFriends, removeFriend, FRIENDS_PAGE, type Friend } from '@/lib/friends';
import { createGame } from '@/lib/games';
import { loadMyFriendCode } from '@/lib/profile';
import Avatar from './Avatar';

export default function FriendsPanel() {
  const { user, isAnonymous } = useAuth();
  if (!user || isAnonymous) {
    return (
      <section className="card">
        <h2>Друзья</h2>
        <p className="muted">Создайте аккаунт, чтобы добавлять друзей и приглашать их в партии.</p>
      </section>
    );
  }
  return <FriendsInner uid={user.uid} />;
}

function FriendsInner({ uid }: { uid: string }) {
  const router = useRouter();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, f] = await Promise.all([loadMyFriendCode(uid), listFriends(uid)]);
        if (!alive) return;
        setMyCode(c);
        setFriends(f);
        setHasMore(f.length === FRIENDS_PAGE);
      } catch {
        if (alive) setErr('Не удалось загрузить друзей.');
      }
    })();
    return () => { alive = false; };
  }, [uid]);

  const add = async () => {
    setErr('');
    try {
      const f = await addFriendByCode(input);
      setFriends((x) => [f, ...x.filter((y) => y.id !== f.id)]);
      setInput('');
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : 'Не удалось добавить друга.');
    }
  };

  const more = async () => {
    const rows = await listFriends(uid, friends[friends.length - 1]?.addedAt);
    setFriends((x) => [...x, ...rows]);
    setHasMore(rows.length === FRIENDS_PAGE);
  };

  const challenge = async (f: Friend) => {
    try { router.push(`/game/${await createGame(f.id)}`); } catch { setErr('Не удалось создать партию.'); }
  };

  return (
    <section className="card col">
      <h2>Друзья</h2>
      <p className="muted">Ваш код друга: <strong>{myCode ?? '…'}</strong></p>
      <div className="row">
        <input placeholder="Код друга" value={input} maxLength={8} autoCapitalize="characters" onChange={(e) => setInput(e.target.value)} />
        <button className="btn" onClick={add}>Добавить</button>
      </div>
      {err && <div className="err">{err}</div>}
      {friends.map((f) => (
        <div key={f.id} className="row">
          <Avatar name={f.name} />
          <span style={{ flex: 1 }}>{f.name}</span>
          <button className="btn" onClick={() => challenge(f)}>Вызвать</button>
          <button className="btn ghost" onClick={async () => { await removeFriend(uid, f.id); setFriends((x) => x.filter((y) => y.id !== f.id)); }}>×</button>
        </div>
      ))}
      {hasMore && <button className="btn ghost" onClick={more}>Ещё</button>}
    </section>
  );
}
