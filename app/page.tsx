import { Metadata } from 'next';
import { Hero } from './_components/Hero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IPA 試験学習アプリ',
  description: 'IPAの資格試験対策のための学習アプリケーション',
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Study By Exam</h1>
            <div className="space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900"
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                新規登録
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              IPAの過去問を効率的に学習
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              基本情報技術者試験や応用情報技術者試験などの過去問を、
              <br />
              効率的に学習できるアプリケーションです。
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-indigo-700"
              >
                今すぐ始める
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">過去問学習</h3>
              <p className="mt-2 text-gray-600">
                試験区分や学習状況に応じて、最適な問題を出題します。
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">学習状況の確認</h3>
              <p className="mt-2 text-gray-600">
                自分の学習状況をグラフで確認できます。
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">問題の提案</h3>
              <p className="mt-2 text-gray-600">
                登録してほしい問題を管理者に提案できます。
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2024 Study By Exam. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 