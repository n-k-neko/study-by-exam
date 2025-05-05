import Link from 'next/link';

export function Hero() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
            <span className="block">IPA試験対策を</span>
            <span className="block text-indigo-200">効率的に学習</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-indigo-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            過去問を解いて、理解度を確認しながら学習を進めることができます。
            基本情報技術者試験、応用情報技術者試験などの対策に最適です。
          </p>
          <div className="mt-10 flex justify-center gap-x-6">
            <Link
              href="/auth/register"
              className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              無料で始める
            </Link>
            <Link
              href="/about"
              className="text-sm font-semibold leading-6 text-white hover:text-indigo-200"
            >
              詳しく見る <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 