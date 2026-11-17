import { doc, getDoc, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { fbDb } from './firebase';
import { randomCode } from './code';

/**
 * Создаёт users/{uid} + friendCodes/{code} (атомарно, batch). Только для НЕанонимных пользователей —
 * гостям профиль не нужен (экономим writes). При коллизии кода friendCodes-create отклоняется
 * Rules (документ уже существует → это update → запрещён) — пробуем другой код.
 * Возвращает friendCode.
 */
export async function ensureProfile(user: User, name: string): Promise<string> {
  const db = fbDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const existing = snap.data()?.friendCode;
  if (typeof existing === 'string') return existing;

  let lastErr: unknown;
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'friendCodes', code), { uid: user.uid });
      b.set(ref, { name: name.slice(0, 30) || 'Игрок', friendCode: code, createdAt: Date.now() });
      await b.commit();
      return code;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function loadMyFriendCode(uid: string): Promise<string | null> {
  const s = await getDoc(doc(fbDb(), 'users', uid));
  const c = s.data()?.friendCode;
  return typeof c === 'string' ? c : null;
}
