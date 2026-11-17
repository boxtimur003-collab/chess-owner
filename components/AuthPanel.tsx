'use client';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import {
  GoogleAccountExistsError,
  authErrorMessage,
  googleLogin,
  guestLogin,
  login,
  logout,
  register,
  signInWithGoogleCredential,
} from '@/lib/authActions';
import { useCheatSession } from '@/lib/cheatSession';
import Avatar from './Avatar';

export default function AuthPanel() {
  const { user, loading, isAnonymous, refresh } = useAuth();
  const { setOpen } = useCheatSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <section className="card muted">Загрузка…</section>;

  if (user && !isAnonymous) {
    const label = user.displayName ?? user.email ?? 'Игрок';
    return (
      <section className="card row">
        <Avatar name={label} />
        <div style={{ flex: 1 }}>
          <strong>{label}</strong>
          <div className="muted">{user.email}</div>
        </div>
        <button className="btn ghost" onClick={async () => { setOpen(false); await logout(); }}>Выйти</button>
      </section>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'register') await register(email.trim(), password, name.trim());
      else await login(email.trim(), password);
      refresh();
    } catch (x) {
      setErr(authErrorMessage(x));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr('');
    setBusy(true);
    try {
      await googleLogin(); // вызывается прямо из клика — попап не блокируется
      refresh();
    } catch (x) {
      if (x instanceof GoogleAccountExistsError) {
        const ok = window.confirm(
          'Этот Google-аккаунт уже используется. Войти в него? Партии текущего гостя не перенесутся.',
        );
        if (ok) {
          try {
            await signInWithGoogleCredential(x.credential);
            refresh();
          } catch (y) {
            setErr(authErrorMessage(y));
          }
        }
      } else {
        setErr(authErrorMessage(x)); // '' при закрытии окна — ничего не показываем
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      {isAnonymous && (
        <p className="muted">
          Вы играете как гость. Регистрация или вход через Google привяжут аккаунт к вашему профилю — партии сохранятся.
        </p>
      )}
      <button className="btn" disabled={busy} onClick={google}>Войти через Google</button>
      <p className="muted" style={{ textAlign: 'center' }}>или по email</p>
      <div className="row">
        <button className={`btn ${mode === 'login' ? '' : 'ghost'}`} onClick={() => setMode('login')}>Вход</button>
        <button className={`btn ${mode === 'register' ? '' : 'ghost'}`} onClick={() => setMode('register')}>Регистрация</button>
      </div>
      <form onSubmit={submit} className="col">
        {mode === 'register' && (
          <input placeholder="Имя" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
        )}
        <input type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Пароль (мин. 6)" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{mode === 'register' ? 'Создать аккаунт' : 'Войти'}</button>
      </form>
      {err && <div className="err">{err}</div>}
      {!user && (
        <button className="btn ghost" onClick={() => guestLogin().catch(() => setErr('Не удалось войти как гость.'))}>
          Играть без аккаунта
        </button>
      )}
    </section>
  );
}