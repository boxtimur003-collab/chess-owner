// Аватарки — инициалы на клиенте (никакого Firebase Storage / внешних картинок).
export default function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return <span className="avatar" style={{ background: `hsl(${h} 45% 40%)` }}>{initials}</span>;
}
