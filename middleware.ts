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
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 