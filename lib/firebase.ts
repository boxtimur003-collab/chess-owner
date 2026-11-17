// Клиентский Firebase SDK. Ленивая инициализация: модуль безопасно импортируется
// при SSR/сборке даже если env ещё не заданы (ошибка возникнет только при реальном вызове).
// Firebase Storage и Cloud Functions НЕ подключаются намеренно (лимиты Spark).
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function app(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  // process.env.NEXT_PUBLIC_* должны читаться статически — иначе Next не подставит значения.
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export const fbAuth = (): Auth => getAuth(app());
export const fbDb = (): Firestore => getFirestore(app());
