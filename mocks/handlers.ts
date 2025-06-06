/**
 * MSWのハンドラー定義ファイル
 * 
 * 主な責務：
 * - 通信のモック定義
 * - 開発環境でのAPIレスポンスのシミュレーション
 * 
 * 本アプリケーションでの使用：
 * - BFFからバックエンドWebAPIへの通信のみをモック
 * - ブラウザからBFFへの通信はモックしない（実際のBFFを使用）
 * 
 * アーキテクチャの説明：
 * 1. ブラウザ → BFF → バックエンドWebAPI
 * 2. ブラウザからBFFへの通信はモックしない（実際のBFFを使用）
 * 3. BFFからバックエンドWebAPIへの通信のみをモック
 * 
 * モックの対象：
 * - BFFがバックエンドWebAPIに送信するリクエスト
 * - バックエンドWebAPIからのレスポンス
 * 
 * モックしない対象：
 * - ブラウザからBFFへのリクエスト
 * - BFFからブラウザへのレスポンス
 */

import { http, HttpResponse } from 'msw';
import { LoginCredentials } from '@/lib/shared/types/auth';


// モック用のユーザーデータ
const mockUsers = [
  {
    userId: 'abc',
    password: 'password123',
    role: 'USER'
  }
];

export const handlers = [
  /**
   * バックエンドWebAPIのログインエンドポイントをモック
   * BFFからのリクエストをインターセプトし、モックレスポンスを返却
   * 
   * フロー：
   * 1. ブラウザ → BFF: 実際のリクエスト
   * 2. BFF → バックエンドWebAPI: このハンドラーでモック
   * 3. バックエンドWebAPI → BFF: モックレスポンス
   * 4. BFF → ブラウザ: 実際のレスポンス
   */
  http.post(`https://localhost:8080/auth/login`, async ({ request }) => {
    const body = await request.json() as LoginCredentials;
    const { userId, password } = body;

    // ユーザー認証
    const user = mockUsers.find(u => u.userId === userId && u.password === password);

    if (!user) {
      return new HttpResponse(
        JSON.stringify({ message: 'Invalid credentials' }),
        { status: 401 }
      );
    }

    // 認証成功時のレスポンス
    return HttpResponse.json({
      user: {
        id: user.userId,
        role: user.role
      }
    });
  }),

  /**
   * バックエンドWebAPIのユーザー情報取得エンドポイントをモック
   * BFFからのリクエストをインターセプトし、モックレスポンスを返却
   * 
   * フロー：
   * 1. ブラウザ → BFF: 実際のリクエスト
   * 2. BFF → バックエンドWebAPI: このハンドラーでモック
   * 3. バックエンドWebAPI → BFF: モックレスポンス
   * 4. BFF → ブラウザ: 実際のレスポンス
   */
  http.get(`https://localhost:8080/users/me`, () => {
    // 認証済みユーザーの詳細情報を返却
    return HttpResponse.json({
      id: '1',
      userId: 'test@example.com',
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