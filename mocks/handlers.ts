import { http, HttpResponse } from 'msw';
import { domains } from '@/lib/bff/web-client/endpoints';

// リクエストの型定義
interface LoginRequest {
  loginId: string;
  password: string;
}

// モック用のユーザーデータ
const mockUsers = [
  {
    loginId: 'abc',
    password: 'password123',
    role: 'USER'
  }
];

export const handlers = [
  // ログインAPI
  http.post(`${domains.userApi}/auth/login`, async ({ request }) => {
    const body = await request.json() as LoginRequest;
    const { loginId, password } = body;

    // ユーザー認証
    const user = mockUsers.find(u => u.loginId === loginId && u.password === password);

    if (!user) {
      return new HttpResponse(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    // 認証成功時のレスポンス
    return HttpResponse.json({
      id: user.loginId,
      role: user.role
    });
  }),

  // ユーザー情報取得API
  http.get(`${domains.userApi}/users/me`, () => {
    // 認証済みユーザーの詳細情報を返却
    return HttpResponse.json({
      id: '1',
      loginId: 'test@example.com',
      name: 'テストユーザー',
      email: 'test@example.com',
      role: 'USER',
      preferences: {
        theme: 'light',
        notifications: true
      }
    });
  })
]; 