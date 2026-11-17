'use client';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { authErrorMessage, guestLogin, login, logout, register } from '@/lib/authActions';
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

  return (
    <section className="card">
      {isAnonymous && (
        <p className="muted">Вы играете как гость. «Регистрация» привяжет email к этому аккаунту — партии сохранятся.</p>
      )}
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
      {!user && (
        <button className="btn ghost" onClick={() => guestLogin().catch(() => setErr('Не удалось войти как гость.'))}>
          Играть без аккаунта
        </button>
      )}
    </section>
  );
}
