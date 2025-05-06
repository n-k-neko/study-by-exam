import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 認証が不要なパス
const publicPaths = ['/', '/login', '/register'];

// パスが公開パスかどうかをチェック
const isPublicPath = (path: string) => {
  return publicPaths.some(publicPath => 
    path === publicPath || path === `${publicPath}/`
  );
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 認証が不要なパスの場合はスキップ
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  // JWTの取得を試みる
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // 認証が必要なパスで未認証の場合、ログインページにリダイレクト
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    // 現在のパスを?callbackUrl=としてクエリに追加
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ミドルウェアを適用するパスを設定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 