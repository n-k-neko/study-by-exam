import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Study By Exam',
  description: 'IPAの過去問を学習できるアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    import('../mocks/browser').then(({ worker }) => {
      worker.start();
    });
  }

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-100`}>{children}</body>
    </html>
  );
} 