import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { RegisterForm } from './_components/RegisterForm';

export const metadata: Metadata = {
  title: '新規登録 - IPA試験学習アプリ',
  description: '新規アカウントを作成して学習を始めましょう',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header pageTitle="新規登録" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              新規登録
            </h2>
            <p className="text-lg text-gray-600">
              または{' '}
              <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                ログインはこちら
              </a>
            </p>
          </div>
          <div className="mt-8">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
} 