import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  linkWithCredential,
  linkWithPopup,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type AuthCredential,
  type User,
  type UserCredential,
} from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
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

/**
 * Google-аккаунт уже привязан к ДРУГОМУ uid. Привязать его к текущему гостю нельзя;
 * можно только войти в существующий аккаунт (партии гостя при этом не переносятся).
 * UI должен спросить подтверждение и вызвать signInWithGoogleCredential(err.credential).
 */
export class GoogleAccountExistsError extends Error {
  constructor(readonly credential: AuthCredential) {
    super('google-account-exists');
  }
}

async function finishGoogle(res: UserCredential): Promise<User> {
  const user = res.user;
  const profileName = getAdditionalUserInfo(res)?.profile?.name;
  const name =
    user.displayName ??
    (typeof profileName === 'string' ? profileName : null) ??
    user.email?.split('@')[0] ??
    'Игрок';
  await ensureProfile(user, name.slice(0, 30)); // создаёт users/{uid} + friendCode, если их ещё нет
  return user;
}

/**
 * Вход через Google. Вызывать СРАЗУ из обработчика клика (до любых await),
 * иначе Safari заблокирует попап.
 *  • Если сейчас гость → linkWithPopup: uid и партии сохраняются.
 *  • Иначе → обычный signInWithPopup.
 */
export async function googleLogin(): Promise<User> {
  const a = fbAuth();
  const provider = new GoogleAuthProvider();
  const cur = a.currentUser;

  if (cur && cur.isAnonymous) {
    try {
      return await finishGoogle(await linkWithPopup(cur, provider));
    } catch (e) {
      if ((e as { code?: string } | null)?.code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(e as FirebaseError);
        if (credential) throw new GoogleAccountExistsError(credential);
      }
      throw e;
    }
  }
  return finishGoogle(await signInWithPopup(a, provider));
}

/** Продолжение после GoogleAccountExistsError (пользователь подтвердил вход в существующий аккаунт). */
export async function signInWithGoogleCredential(credential: AuthCredential): Promise<User> {
  return finishGoogle(await signInWithCredential(fbAuth(), credential));
}

export const logout = (): Promise<void> => signOut(fbAuth());

/** Пустая строка = пользователь сам закрыл окно, ошибку показывать не нужно. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'Этот email уже зарегистрирован — войдите (партии гостя при этом не перенесутся).';
    case 'auth/account-exists-with-different-credential':
      return 'Для этого email уже есть другой способ входа — войдите им.';
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
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'Браузер заблокировал окно входа. Разрешите всплывающие окна и повторите.';
    case 'auth/unauthorized-domain':
      return 'Домен не добавлен в Authentication → Authorized domains.';
    default:
      return 'Ошибка авторизации. Попробуйте ещё раз.';
  }
}