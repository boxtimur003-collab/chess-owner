'use client';
import Link from 'next/link';
import TapGate from '@/components/TapGate';
import { OwnerOverlay } from '@/components/CheatOverlay';
import { useCheatSession } from '@/lib/cheatSession';

const VERSION = '1.0.0';

export default function About() {
  const { open, setOpen } = useCheatSession();
  return (
    <main className="page">
      <Link href="/" className="muted">← Назад</Link>
      <h1>О приложении</h1>
      <p>Шахматы · версия {VERSION}</p>
      <p className="muted">Классические шахматы: онлайн по коду, с друзьями и против ИИ.</p>
      <div style={{ flex: 1 }} />
      {/* Пустое место внизу: 10 тапов → проверка owner на сервере */}
      <TapGate onOpen={() => setOpen(true)} />
      {open && <OwnerOverlay onClose={() => setOpen(false)} />}
    </main>
  );
}
