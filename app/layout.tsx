import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Study By Exam',
  description: 'IPAの過去問を学習できるアプリケーション',
};

/**
 * MSWの初期化
 * 
 * 主な責務：
 * - 環境（サーバーサイド/クライアントサイド）に応じたMSWの初期化
 * - 開発環境でのみMSWを起動
 * 
 * 初期化の流れ：
 * 1. サーバーサイド（SSR）の場合：
 *    - server.tsのサーバーインスタンスをインポート
 *    - サーバーサイドでのAPIモックを有効化
 * 
 * 2. クライアントサイドの場合：
 *    - browser.tsのワーカーをインポート
 *    - ブラウザ環境でのAPIモックを有効化
 * 
 * 環境判定の仕組み：
 * - typeof window === 'undefined'
 *   - true: サーバーサイド（windowオブジェクトが存在しない）
 *   - false: クライアントサイド（windowオブジェクトが存在する）
 * 
 * 注意：
 * - 開発環境でのみ初期化を実行
 * - 本アプリケーションではBFFを経由するため、
 *   クライアントサイドのモックは実際には使用されない
 */
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