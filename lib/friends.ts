// Друзья: односторонняя «адресная книга» users/{me}/friends/{friendUid}. Только getDocs с limit(), без realtime.
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, startAfter } from 'firebase/firestore';
import { fbAuth, fbDb } from './firebase';
import { normalizeCode } from './code';

export const FRIENDS_PAGE = 20;
export type Friend = { id: string; name: string; addedAt: number };

export async function listFriends(uid: string, after?: number): Promise<Friend[]> {
  const col = collection(fbDb(), 'users', uid, 'friends');
  const q = after === undefined
    ? query(col, orderBy('addedAt', 'desc'), limit(FRIENDS_PAGE))
    : query(col, orderBy('addedAt', 'desc'), startAfter(after), limit(FRIENDS_PAGE));
  return (await getDocs(q)).docs.map((d) => {
    const x = d.data() as { name: string; addedAt: number };
    return { id: d.id, name: x.name, addedAt: x.addedAt };
  });
}

export async function addFriendByCode(rawCode: string): Promise<Friend> {
  const me = fbAuth().currentUser;
  if (!me) throw new Error('not signed in');
  const code = normalizeCode(rawCode);
  if (!code) throw new Error('Неверный код друга.');
  const fc = await getDoc(doc(fbDb(), 'friendCodes', code));
  const friendUid = fc.data()?.uid;
  if (typeof friendUid !== 'string') throw new Error('Код не найден.');
  if (friendUid === me.uid) throw new Error('Это ваш собственный код.');
  const prof = await getDoc(doc(fbDb(), 'users', friendUid));
  const name = String(prof.data()?.name ?? 'Игрок').slice(0, 30);
  const addedAt = Date.now();
  await setDoc(doc(fbDb(), 'users', me.uid, 'friends', friendUid), { name, addedAt });
  return { id: friendUid, name, addedAt };
}

export async function removeFriend(uid: string, friendUid: string): Promise<void> {
  await deleteDoc(doc(fbDb(), 'users', uid, 'friends', friendUid));
}
