import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/AuthProvider';
import { CheatSessionProvider } from '@/lib/cheatSession';

export const metadata: Metadata = {
  title: 'Chess',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Chess', statusBarStyle: 'black-translucent' },
  icons: { apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1b1b1b',
};

// CheatSessionProvider обёрнут вокруг ВСЕГО дерева (внутри AuthProvider) → состояние переживает
// клиентские переходы между страницами и сбрасывается только полной перезагрузкой приложения.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <CheatSessionProvider>{children}</CheatSessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
