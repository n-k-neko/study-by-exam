/**
 * 認証ミドルウェア
 * 
 * このミドルウェアは、アプリケーション全体の認証制御を担当します。
 * 
 * 主な機能：
 * 1. パブリックパスの制御
 *    - /login, /register, /auth などのパスは認証不要
 *    - これらのパスへのアクセスは常に許可
 * 
 * 2. 認証チェック
 *    - パブリックパス以外へのアクセスは認証必須
 *    - 未認証ユーザーは自動的にログインページにリダイレクト
 * 
 * 3. パスの除外設定
 *    - 静的ファイル、APIルート、画像ファイルなどは認証チェックから除外
 *    - パフォーマンスとセキュリティのバランスを考慮
 * 
 * 処理の流れ：
 * 1. リクエストのパスをチェック
 * 2. パブリックパスの場合は認証チェックをスキップ
 * 3. それ以外のパスは認証状態を確認
 * 4. 未認証の場合はログインページにリダイレクト
 * 
 * 注意点：
 * - このミドルウェアはエッジランタイムで実行される
 * - 認証チェックは軽量な処理に留める
 * - 詳細な認証・認可は各APIルートで実装
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/bff/auth/auth';

// 認証が不要なパス
const publicPaths = ['/login', '/register', '/auth'];

export default auth(async function middleware(req: NextRequest) {
  const isPublicPath = publicPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const session = await auth();
  if (!session?.user) {
    return Response.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

// 認証ミドルウェアを適用するパスを設定
export const config = {
  matcher: [
    /*
     * 以下のパスを除くすべてのリクエストパスに認証チェックを適用します：
     * - api/* : APIルート（バックエンドとの通信）
     * - _next/static/* : 静的ファイル（CSS、JavaScript等）
     * - _next/image/* : 画像最適化ファイル
     * - favicon.ico : ファビコン
     * 
     * これらのパスは認証チェックから除外されます。
     * 理由：
     * - 静的ファイルは認証不要で高速に配信する必要がある
     * - APIルートは独自の認証・認可処理を持つ
     * - 画像やファビコンは認証不要のリソース
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 