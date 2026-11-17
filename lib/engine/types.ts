export type Scored = { san: string; from: string; to: string; promotion?: string; cp: number };

export type Req =
  | { id: number; type: 'analyze'; fen: string; depth: number; k: number; ms: number }
  | { id: number; type: 'ai'; fen: string; level: number };

export type Res = { id: number; list: Scored[] };
