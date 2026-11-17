// Выдача/отзыв овнерки. НЕ публичный API: нужны (1) ID-токен супер-овнера (UID из env) И (2) секрет из env.
// Любая ошибка → 404. Claim ставится только здесь, через Admin SDK, — клиент подделать не может.
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { adminAuth, adminDb } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const notFound = () => new NextResponse(null, { status: 404 });

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export async function POST(req: NextRequest) {
  try {
    const superUid = process.env.SUPER_OWNER_UID;
    const expected = process.env.OWNER_SECRET;
    if (!superUid || !expected) return notFound();

    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    const me = await adminAuth().verifyIdToken(token, true);
    if (me.uid !== superUid) return notFound();
    if (!safeEqual(req.headers.get('x-owner-secret') ?? '', expected)) return notFound();

    const body = (await req.json()) as { uid?: unknown; owner?: unknown };
    if (typeof body.uid !== 'string' || body.uid.length === 0 || body.uid.length > 128) return notFound();
    if (typeof body.owner !== 'boolean') return notFound();

    const target = await adminAuth().getUser(body.uid); // бросит, если uid не существует → 404
    if (body.owner) {
      await adminAuth().setCustomUserClaims(body.uid, { owner: true });
      await adminDb().doc(`owners/${body.uid}`).set({ grantedAt: Date.now(), email: target.email ?? null }); // 1 write
    } else {
      await adminAuth().setCustomUserClaims(body.uid, null);
      await adminDb().doc(`owners/${body.uid}`).delete(); // 1 delete
      // Без этого claim остаётся в уже выданном токене до ~1 часа. checkRevoked в cheat-gate его отсечёт сразу.
      await adminAuth().revokeRefreshTokens(body.uid);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return notFound();
  }
}
