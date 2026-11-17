import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { fbAuth } from './firebase';
import { ensureProfile } from './profile';

/** Игра без аккаунта: анонимный вход (бесплатно на Spark, нужен, чтобы Rules работали по uid). */
export async function guestLogin(): Promise<User> {
  const a = fbAuth();
  if (a.currentUser) return a.currentUser;
  return (await signInAnonymously(a)).user;
}

/**
 * Регистрация. Если пользователь сейчас гость — ПРИВЯЗЫВАЕМ email/password к анонимному аккаунту
 * (linkWithCredential): uid и старые партии сохраняются. Иначе — обычное создание аккаунта.
 */
export async function register(email: string, password: string, name: string): Promise<User> {
  const a = fbAuth();
  const cur = a.currentUser;
  const user =
    cur && cur.isAnonymous
      ? (await linkWithCredential(cur, EmailAuthProvider.credential(email, password))).user
      : (await createUserWithEmailAndPassword(a, email, password)).user;
  const clean = name.slice(0, 30) || 'Игрок';
  await updateProfile(user, { displayName: clean });
  await ensureProfile(user, clean);
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const user = (await signInWithEmailAndPassword(fbAuth(), email, password)).user;
  await ensureProfile(user, user.displayName ?? 'Игрок'); // 1 read, если профиль уже есть
  return user;
}

export const logout = (): Promise<void> => signOut(fbAuth());

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'Этот email уже зарегистрирован — войдите (партии гостя при этом не перенесутся).';
    case 'auth/weak-password':
      return 'Пароль слишком короткий (минимум 6 символов).';
    case 'auth/invalid-email':
      return 'Неверный email.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Неверный email или пароль.';
    case 'auth/too-many-requests':
      return 'Слишком много попыток, попробуйте позже.';
    case 'auth/operation-not-allowed':
      return 'Этот способ входа не включён в Firebase Console.';
    default:
      return 'Ошибка авторизации. Попробуйте ещё раз.';
  }
}
