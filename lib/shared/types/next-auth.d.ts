/**
 * NextAuth.jsの型定義拡張
 * 
 * このファイルは宣言的マージ（Declaration Merging）を使用して、
 * NextAuth.jsの型定義を拡張します。
 * 
 * 特徴：
 * - 明示的なインポートは不要
 * - TypeScriptが自動的に型定義を認識
 * - プロジェクト全体でNextAuth.jsの型が拡張される
 * 
 * 使用例：
 * - auth()の戻り値の型
 * - useSession()フックの戻り値の型
 * - JWTトークンの型
 */

import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    name?: string;
    email?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      name?: string;
      email?: string;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
  }
} 