/**
 * NextAuth.jsの型定義を管理するファイル
 * 
 * 主な責務：
 * - 認証関連の基本型定義
 * - NextAuth.jsの型拡張
 */

import type { DefaultSession } from 'next-auth';

/**
 * 認証済みユーザーの基本情報
 */
export interface AuthenticatedUserBase {
  id: string;
  role: string;
}

// NextAuth.jsの型定義を拡張
// アプリケーション全体で使用される認証関連の型定義

// User型の拡張：認証済みユーザーの基本情報を定義
declare module 'next-auth' {
  interface User extends AuthenticatedUserBase {}

  // Session型の拡張：クライアントで利用可能なユーザー情報を定義
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user']
  }
}

/**
 * NextAuthのJWT型の拡張
 * JWTトークンにuserIdとroleを追加
 */
declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
  }
} 