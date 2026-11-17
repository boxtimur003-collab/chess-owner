import type { ReactElement } from 'react';

// Минималистичные SVG-фигуры (viewBox 45×45). Это базовый набор; для более «премиального» вида
// замените пути на любой открыто лицензированный сет — интерфейс <Piece/> не изменится.
const P: Record<string, ReactElement> = {
  p: <><circle cx="22.5" cy="13" r="5.5" /><path d="M14 35c0-9 4-11 6-14h5c2 3 6 5 6 14z" /><rect x="11" y="35" width="23" height="4" rx="1.5" /></>,
  r: <path d="M12 39h21v-4H12zM14 35V19h17v16zM12 19v-7h5v3h4v-3h3v3h4v-3h5v7z" />,
  n: <path d="M13 39h21v-4c0-9-2-14-8-18l3-6-6 2c-8 3-10 9-10 15 0 3 2 4 4 3l5-5c-2 5-9 6-9 13z" />,
  b: <path d="M22.5 6c4 3 7 8 7 13 0 3-2 5-4 7h-6c-2-2-4-4-4-7 0-5 3-10 7-13zM12 39h21v-4H12zM15 35c3-2 5-5 5-9h5c0 4 2 7 5 9z" />,
  q: <path d="M10 15l5 14h15l5-14-7 8-5-12-5 12zM13 39h19v-4H13zM15 35h15v-6H15z" />,
  k: <path d="M21 6h3v4h4v3h-4v4h-3v-4h-4v-3h4zM12 17c4-3 17-3 21 0 3 6-2 12-4 15v3H16v-3c-2-3-7-9-4-15zM11 39h23v-4H11z" />,
};

export function Piece({ type, color }: { type: string; color: 'w' | 'b' }) {
  return (
    <svg
      viewBox="0 0 45 45"
      className="piece-svg"
      fill={color === 'w' ? '#fafafa' : '#2b2b2b'}
      stroke={color === 'w' ? '#222' : '#000'}
      strokeWidth="1.4"
      strokeLinejoin="round"
    >
      {P[type]}
    </svg>
  );
}
