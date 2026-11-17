'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { fbDb } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthProvider';

type OwnerRow = { uid: string; email: string | null; grantedAt: number };
const WARN_AFTER = 10;

export default function SuperPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isSuper = !!user && user.uid === process.env.NEXT_PUBLIC_SUPER_OWNER_UID;

  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [targetUid, setTargetUid] = useState('');
  const [secret, setSecret] = useState(''); // вводится вручную, живёт только в памяти этой вкладки
  const [calls, setCalls] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (!loading && !isSuper) router.replace('/'); }, [loading, isSuper, router]);

  const loadOwners = useCallback(async () => {
    try {
      // limit(50) обязателен: Rules отклоняют list без limit <= 50.
      const snap = await getDocs(query(collection(fbDb(), 'owners'), limit(50)));
      setOwners(snap.docs.map((d) => {
        const x = d.data() as { email?: string | null; grantedAt?: number };
        return { uid: d.id, email: x.email ?? null, grantedAt: x.grantedAt ?? 0 };
      }));
    } catch {
      setMsg('Не удалось прочитать owners (проверьте UID в Firestore Rules).');
    }
  }, []);
  useEffect(() => { if (isSuper) void loadOwners(); }, [isSuper, loadOwners]);

  const call = async (uid: string, owner: boolean) => {
    if (!user) return;
    setMsg('');
    setCalls((c) => c + 1);
    try {
      const token = await user.getIdToken();
      const r = await fetch('/api/set-owner', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-owner-secret': secret, 'content-type': 'application/json' },
        body: JSON.stringify({ uid: uid.trim(), owner }),
      });
      if (r.ok) { setMsg(owner ? 'Овнерка выдана.' : 'Овнерка отозвана.'); await loadOwners(); }
      else setMsg('Отказ (404): проверьте UID и секрет.');
    } catch {
      setMsg('Сетевая ошибка.');
    }
  };

  if (!isSuper) return null;
  return (
    <main className="page">
      <Link href="/about" className="muted">← Назад</Link>
      <h1>Овнеры</h1>
      <section className="card col">
        <input placeholder="UID пользователя" value={targetUid} onChange={(e) => setTargetUid(e.target.value)} />
        <input type="password" placeholder="Секрет (OWNER_SECRET)" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <div className="row">
          <button className="btn" disabled={!targetUid || !secret} onClick={() => call(targetUid, true)}>Выдать</button>
          <button className="btn ghost" disabled={!targetUid || !secret} onClick={() => call(targetUid, false)}>Забрать</button>
        </div>
        <p className="muted">
          Не спамь выдачей овнерок — каждый вызов set-owner = 1 write в owners + revokeRefreshTokens при отзыве.
          Вызовов за сессию: {calls}.
        </p>
        {calls >= WARN_AFTER && <div className="err">Уже {calls} вызовов: проверь лимиты (Firebase Console → Usage).</div>}
        {msg && <div>{msg}</div>}
      </section>
      <section className="card col">
        <h2>Текущие овнеры ({owners.length})</h2>
        {owners.map((o) => (
          <div key={o.uid} className="row">
            <span style={{ flex: 1, wordBreak: 'break-all' }}>{o.email ?? o.uid}<div className="muted">{o.uid}</div></span>
            <button className="btn ghost" disabled={!secret} onClick={() => call(o.uid, false)}>Забрать</button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => void loadOwners()}>Обновить</button>
      </section>
    </main>
  );
}
