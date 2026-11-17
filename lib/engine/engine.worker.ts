// Шахматный движок в Web Worker: негамакс + alpha-beta + итеративное углубление с лимитом времени.
// Правила/генерация ходов — chess.js. Оценка простая (материал + центр + продвижение пешек):
// это ИИ «для друзей», не Stockfish. Оценка в сантипешках с точки зрения стороны, чей ход.
import { Chess, type Move } from 'chess.js';
import type { Req, Res, Scored } from './types';

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;
const INF = 1e9;

class Abort extends Error {}
let deadline = Infinity;
let nodes = 0;

function evaluate(g: Chess): number {
  let s = 0;
  for (const row of g.board()) {
    for (const c of row) {
      if (!c) continue;
      const f = c.square.charCodeAt(0) - 97;
      const r = Number(c.square[1]) - 1;
      let v = VAL[c.type];
      if (c.type === 'n' || c.type === 'b') v += (3.5 - (Math.abs(f - 3.5) + Math.abs(r - 3.5)) / 2) * 6;
      if (c.type === 'p') v += (c.color === 'w' ? r : 7 - r) * 4;
      s += c.color === 'w' ? v : -v;
    }
  }
  return g.turn() === 'w' ? s : -s;
}

const moveScore = (m: Move): number =>
  (m.captured ? VAL[m.captured] * 10 - VAL[m.piece] : 0) + (m.promotion ? 800 : 0);
const order = (ms: Move[]): Move[] => ms.sort((a, b) => moveScore(b) - moveScore(a));

function search(g: Chess, d: number, alpha: number, beta: number): number {
  if ((++nodes & 255) === 0 && Date.now() > deadline) throw new Abort();
  // Горизонт: если шах — продлеваем на 1 полуход (иначе матовые комбинации «не видны»).
  if (d <= 0 && (d < -2 || !g.inCheck())) return evaluate(g);

  const ms = g.moves({ verbose: true });
  if (ms.length === 0) return g.inCheck() ? -MATE - d : 0; // мат (чем быстрее — тем лучше) или пат
  if (g.isInsufficientMaterial() || g.isDrawByFiftyMoves()) return 0;

  let a = alpha;
  for (const m of order(ms)) {
    g.move({ from: m.from, to: m.to, promotion: m.promotion });
    const sc = -search(g, d - 1, -beta, -a);
    g.undo();
    if (sc > a) a = sc;
    if (a >= beta) break;
  }
  return a;
}

/**
 * КОРНЕВОЙ alpha-beta для top-K ходов. Окно (alpha) на корне = оценка K-го лучшего хода,
 * найденного к текущему моменту, поэтому слабые ходы отсекаются быстро. Попавшие в top-K
 * оценки точные (они строго выше alpha), включая лучший — его оценка и есть оценка позиции.
 */
function rootTopK(fen: string, depth: number, k: number): Scored[] {
  const g = new Chess(fen);
  const top: Scored[] = [];
  for (const m of order(g.moves({ verbose: true }))) {
    const alpha = top.length >= k ? top[top.length - 1].cp : -INF;
    g.move({ from: m.from, to: m.to, promotion: m.promotion });
    const cp = -search(g, depth - 1, -INF, -alpha);
    g.undo();
    if (top.length < k || cp > alpha) {
      let i = top.findIndex((t) => t.cp < cp);
      if (i < 0) i = top.length;
      top.splice(i, 0, { san: m.san, from: m.from, to: m.to, promotion: m.promotion, cp });
      if (top.length > k) top.pop();
    }
  }
  return top;
}

/** Итеративное углубление: возвращает результат последней ПОЛНОСТЬЮ завершённой глубины. */
function analyze(fen: string, depth: number, k: number, ms: number): Scored[] {
  deadline = Date.now() + ms;
  nodes = 0;
  let best: Scored[] = [];
  for (let d = 1; d <= depth; d++) {
    try {
      best = rootTopK(fen, d, k);
    } catch (e) {
      if (e instanceof Abort) break;
      throw e;
    }
  }
  return best;
}

function aiMove(fen: string, level: number): Scored[] {
  const g = new Chess(fen);
  const legal = g.moves({ verbose: true });
  if (legal.length === 0) return [];
  if (level <= 1) {
    const m = legal[Math.floor(Math.random() * legal.length)];
    return [{ san: m.san, from: m.from, to: m.to, promotion: m.promotion, cp: 0 }];
  }
  if (level === 2) {
    const top = analyze(fen, 1, 3, 500);
    return [top[Math.floor(Math.random() * top.length)]];
  }
  const cfg = level === 3 ? { d: 2, ms: 1500 } : level === 4 ? { d: 3, ms: 2500 } : { d: 4, ms: 4000 };
  return analyze(fen, cfg.d, 1, cfg.ms).slice(0, 1);
}

interface WorkerCtx {
  postMessage(m: Res): void;
  onmessage: ((e: MessageEvent<Req>) => void) | null;
}
const ctx = self as unknown as WorkerCtx;

ctx.onmessage = (e) => {
  const r = e.data;
  let list: Scored[] = [];
  try {
    list = r.type === 'analyze' ? analyze(r.fen, r.depth, r.k, r.ms) : aiMove(r.fen, r.level);
  } catch {
    list = [];
  }
  ctx.postMessage({ id: r.id, list });
};
