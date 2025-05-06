/**
 * NextAuth.jsの型定義を管理するファイル
 * 
 * 主な責務：
 * - 認証関連の基本型定義
 * - NextAuth.jsの型拡張
 */

import type { DefaultSession } from 'next-auth';

// 認証済みユーザーの基本情報を表す型
// JWTとセッションに保存される最小限の情報
export type AuthenticatedUserBase = {
  id: string;    // ユーザーの一意識別子
  role: string;  // ユーザーの権限情報
};

// NextAuth.jsの型定義を拡張
// アプリケーション全体で使用される認証関連の型定義

// User型の拡張：認証済みユーザーの基本情報を定義
declare module 'next-auth' {
  interface User extends AuthenticatedUserBase {}

  // Session型の拡張：クライアントで利用可能なユーザー情報を定義
  interface Session extends DefaultSession {
    user: AuthenticatedUserBase & DefaultSession['user']
  }
}

// JWT型の拡張：トークンに含める情報を定義
declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;  // ユーザーの一意識別子
    role: string;    // ユーザーの権限情報
  }
} 