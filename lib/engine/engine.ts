import type { Req, Res, Scored } from './types';
export type { Scored } from './types';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (list: Scored[]) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent<Res>) => {
      pending.get(e.data.id)?.(e.data.list);
      pending.delete(e.data.id);
    };
  }
  return worker;
}

// Distributive Omit: сохраняет union по `type`.
type Body = Req extends infer R ? (R extends Req ? Omit<R, 'id'> : never) : never;
function call(body: Body): Promise<Scored[]> {
  return new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    getWorker().postMessage({ id, ...body } as Req);
  });
}

/** Top-K ходов с оценкой (cp — с точки зрения стороны, чей ход), от лучшего к худшему. */
export const analyze = (fen: string, opts: { depth?: number; k?: number; ms?: number } = {}): Promise<Scored[]> =>
  call({ type: 'analyze', fen, depth: opts.depth ?? 3, k: opts.k ?? 10, ms: opts.ms ?? 1500 });

export const aiMove = async (fen: string, level: number): Promise<Scored | null> =>
  (await call({ type: 'ai', fen, level }))[0] ?? null;
