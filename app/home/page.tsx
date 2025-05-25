import { auth } from '@/lib/bff/auth/auth';
import { Header } from '@/components/Header';

export default async function HomePage() {
  const session = await auth();

  return (
    <>
      <Header pageTitle="ホーム" />
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              ホーム画面
            </h1>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  ログイン情報
                </h2>
                <div className="mt-2 text-sm text-gray-600">
                  <p>ユーザーID: {session?.user?.id}</p>
                  <p>ロール: {session?.user?.role}</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  ようこそ！
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  認証が成功し、ホーム画面にリダイレクトされました。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 