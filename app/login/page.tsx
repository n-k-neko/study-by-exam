import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { LoginForm } from './_components/LoginForm';

export const metadata: Metadata = {
  title: 'ログイン - IPA試験学習アプリ',
  description: 'アカウントにログインして学習を始めましょう',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header pageTitle="ログイン" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="text-4xl font-black text-blue-900 mb-2">
              ログイン
            </div>
            <p className="text-lg text-blue-700">
              または{' '}
              <a href="/register" className="font-bold text-blue-900 hover:text-blue-700 underline">
                新規登録はこちら
              </a>
            </p>
          </div>
          <div className="mt-4">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
} 