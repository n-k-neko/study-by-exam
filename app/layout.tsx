import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Study By Exam',
  description: 'IPAの過去問を学習できるアプリケーション',
};

// MSWの初期化
const initMocks = async () => {
  if (typeof window === 'undefined') {
    const { server } = await import('@/mocks/server');
    server.listen();
  } else {
    const { worker } = await import('@/mocks/browser');
    worker.start();
  }
};

if (process.env.NODE_ENV === 'development') {
  initMocks();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-100`}>{children}</body>
    </html>
  );
} 