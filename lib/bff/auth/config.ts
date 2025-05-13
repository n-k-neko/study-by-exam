/**
 * NextAuth.jsの設定を管理するファイル
 * 
 * 主な責務：
 * - 認証プロバイダーの設定（Credentials認証）
 * - セッション設定（JWT戦略、有効期限）
 * - コールバック関数の定義（JWT生成、セッション管理）
 * - 認証関連ページのパス設定
 * - 環境変数のバリデーション
 * 
 * このファイルは設定のみを扱い、実際の認証機能は auth.ts でエクスポートされる
 */

import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthResponse } from '@/lib/shared/types/auth';
import type { AuthenticatedUserBase } from './types';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set');
}

// NextAuth.jsの設定オブジェクト
export const authConfig = {
  // 認証プロバイダーの設定
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      // フォームから受け取る認証情報の定義
      // signIn('credentials', { user: JSON.stringify(user) }) で渡された値が
      // このuserフィールドにマッピングされる
      // 例: '{"id":"abc","role":"USER"}' が credentials.user として渡される
      credentials: {
        user: { 
          label: "User", 
          type: "text",  // JSON文字列を受け取るため、text
          description: "ユーザー情報（JSON文字列形式）" 
        }
      },
      // 認証処理の実装
      // credentials.user には signIn から渡されたJSON文字列が入っている
      // Partial<Record<"user", unknown>> は NextAuthが定義している型
      // - Record<"user", unknown>: userキーに対してunknown型の値を持つオブジェクト
      // - Partial<...>: すべてのプロパティをオプショナルにする
      // 結果として credentials は { user?: unknown } という型になる
      // 実行時には signIn から文字列が渡されるので { user: string } となる
      async authorize(credentials: Partial<Record<"user", unknown>>) {
        if (!credentials?.user || typeof credentials.user !== 'string') {
          return null;
        }

        try {
          // signInから渡されたJSON文字列をパース
          // 例: '{"id":"abc","role":"USER"}' → { id: 'abc', role: 'USER' }
          const user = JSON.parse(credentials.user) as { id: string; role: string };
          // NextAuth.jsのセッションで使用するユーザー情報を返却
          // この返却値は signIn の結果として使用され、NextAuthのセッションに保存される
          // 例: { id: 'abc', role: 'USER' } が返却され、signInの結果として使用される
          return {
            id: user.id,
            role: user.role
          };
        } catch (error) {
          return null;
        }
      }
    })
  ],
  // セッション設定
  session: {
    strategy: 'jwt', // JWTを使用したセッション管理
    maxAge: 7 * 24 * 60 * 60, // セッションの有効期限（7日間）
  },
  // カスタムページのパス設定
  pages: {
    signIn: '/login', // ログインページのパス
    signOut: '/logout' // ログアウトページのパス
  },
  // 認証フローのカスタマイズ
  callbacks: {
    // JWTトークンが作成・更新される際に呼ばれる
    async jwt({ token, user }: { token: JWT, user: any }) {
      if (user && typeof user === 'object' && 'id' in user && 'role' in user) {
        const typedUser = user as AuthenticatedUserBase;
        // ユーザー情報をJWTに追加
        token.userId = typedUser.id;
        token.role = typedUser.role;
      }
      return token;
    },
    // セッション情報がクライアントに渡される際に呼ばれる
    async session({ session, token }: { session: Session, token: JWT }) {
      if (session.user) {
        // JWTの情報をセッションのuser objectに追加
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  // 開発環境でのみデバッグログを有効化
  debug: process.env.NODE_ENV === 'development',
  // JWTの署名に使用する秘密鍵
  secret: process.env.AUTH_SECRET
};

// NextAuth.jsの設定をエクスポート
// 実際の認証機能（handlers, auth, signIn, signOut）は auth.ts でエクスポート
export const config = authConfig; 