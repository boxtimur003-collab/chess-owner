// Firebase Admin SDK — ТОЛЬКО для API-роутов (runtime = 'nodejs'). Не импортировать из клиентского кода.
// Инициализация ленивая: на этапе `next build` env может отсутствовать, и модуль не должен падать при импорте.
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const b64 = process.env.FIREBASE_SA_B64;
  if (!b64) throw new Error('FIREBASE_SA_B64 is not set');
  const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as Record<string, string>;
  return initializeApp({ credential: cert(sa) });
}

export const adminAuth = (): Auth => getAuth(adminApp());
export const adminDb = (): Firestore => getFirestore(adminApp());
