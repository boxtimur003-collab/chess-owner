// Firestore: партии. Лимиты Spark (20k writes/день, 50k reads/день):
//  • один realtime-listener = ОДИН документ партии (watchGame);
//  • каждый ход = 1 write (+1 read каждому слушателю);
//  • все list-запросы — с limit() (Rules это требуют: request.query.limit <= 20).
import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, startAfter, updateDoc, where,
  type Unsubscribe,
} from 'firebase/firestore';
import { fbAuth, fbDb } from './firebase';
import { randomCode } from './code';
import type { Mv } from './tracked';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const PAGE = 20;

export type GameStatus = 'waiting' | 'playing' | 'finished';
export interface GameDoc {
  white: string;
  black: string | null;
  players: string[];
  invited: string | null;
  fen: string;
  turn: 'w' | 'b';
  status: GameStatus;
  lastMove: Mv | null;
  moveCount: number;
  result?: string;
  createdAt: number;
}
export type GameRow = GameDoc & { id: string };

const cleanMove = (m: Mv): Mv => (m.promotion ? { from: m.from, to: m.to, promotion: m.promotion } : { from: m.from, to: m.to });

function uidOrThrow(): string {
  const u = fbAuth().currentUser;
  if (!u) throw new Error('not signed in');
  return u.uid;
}

/** Создаёт партию; код = id документа. Транзакция с проверкой !exists() защищает от коллизий кода. */
export async function createGame(invited: string | null = null): Promise<string> {
  const db = fbDb();
  const uid = uidOrThrow();
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const ref = doc(db, 'games', code);
    const created = await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) return false;
      const data: GameDoc = {
        white: uid, black: null, players: [uid], invited, fen: START_FEN, turn: 'w',
        status: 'waiting', lastMove: null, moveCount: 0, createdAt: Date.now(),
      };
      tx.set(ref, data);
      return true;
    });
    if (created) return code;
  }
  throw new Error('could not allocate game code');
}

/** Присоединение вторым игроком (1 write). Rules: black == null, uid != white. */
export async function acceptGame(id: string, white: string): Promise<void> {
  const uid = uidOrThrow();
  await updateDoc(doc(fbDb(), 'games', id), { black: uid, players: [white, uid], status: 'playing' });
}

export async function pushMove(
  id: string,
  p: { fen: string; turn: 'w' | 'b'; lastMove: Mv; moveCount: number; result?: string },
): Promise<void> {
  // Firestore не принимает undefined → поле result добавляем только при завершении.
  const data = {
    fen: p.fen, turn: p.turn, lastMove: cleanMove(p.lastMove), moveCount: p.moveCount,
    ...(p.result ? { status: 'finished' as const, result: p.result } : {}),
  };
  await updateDoc(doc(fbDb(), 'games', id), data);
}

export async function resign(id: string, myColor: 'w' | 'b'): Promise<void> {
  await updateDoc(doc(fbDb(), 'games', id), { status: 'finished', result: myColor === 'w' ? '0-1' : '1-0' });
}

export function watchGame(id: string, cb: (g: GameDoc | null) => void, onError: () => void): Unsubscribe {
  return onSnapshot(
    doc(fbDb(), 'games', id),
    (s) => cb(s.exists() ? (s.data() as GameDoc) : null),
    onError,
  );
}

/** Мои партии: where(array-contains).orderBy.limit(20) → нужен индекс из firestore.indexes.json. */
export async function listMyGames(uid: string, before?: number): Promise<GameRow[]> {
  const base = [where('players', 'array-contains', uid), orderBy('createdAt', 'desc')];
  const q = before === undefined
    ? query(collection(fbDb(), 'games'), ...base, limit(PAGE))
    : query(collection(fbDb(), 'games'), ...base, startAfter(before), limit(PAGE));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...(d.data() as GameDoc) }));
}

/** Приглашения мне (ожидающие партии). Одноразовый getDocs, без realtime. */
export async function listInvites(uid: string): Promise<GameRow[]> {
  const q = query(collection(fbDb(), 'games'), where('invited', '==', uid), where('status', '==', 'waiting'), limit(5));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...(d.data() as GameDoc) }));
}
