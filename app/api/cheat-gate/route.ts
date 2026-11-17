// Проверка owner перед открытием меню. Любая ошибка → 404 (не раскрываем существование эндпоинта).
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/admin';

export const runtime = 'nodejs'; // Admin SDK не работает на edge
export const dynamic = 'force-dynamic';

const notFound = () => new NextResponse(null, { status: 404 });

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    const decoded = await adminAuth().verifyIdToken(token, true); // true = учитывать отозванные токены
    return decoded.owner === true ? new NextResponse(null, { status: 204 }) : notFound();
  } catch {
    return notFound();
  }
}
