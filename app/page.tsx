'use client';
import Link from 'next/link';
import PwaBanner from '@/components/PwaBanner';
import AuthPanel from '@/components/AuthPanel';
import GamesPanel from '@/components/GamesPanel';
import FriendsPanel from '@/components/FriendsPanel';

export default function Lobby() {
  return (
    <main className="page">
      <h1>Шахматы</h1>
      <PwaBanner />
      <AuthPanel />
      <GamesPanel />
      <FriendsPanel />
      <Link href="/about" className="muted" style={{ textAlign: 'center' }}>О приложении</Link>
    </main>
  );
}
