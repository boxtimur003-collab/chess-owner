'use client';
import { useEffect, useState } from 'react';

const KEY = 'pwa-banner-dismissed';

export default function PwaBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* приватный режим */ }
    setShow(!standalone && !dismissed);
  }, []);
  if (!show) return null;
  return (
    <div className="banner">
      Установите приложение на экран «Домой» (Поделиться → «На экран „Домой"») и войдите уже оттуда —
      сессия Safari в PWA не переносится.
      <button
        className="btn ghost"
        onClick={() => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setShow(false); }}
      >
        Понятно
      </button>
    </div>
  );
}
