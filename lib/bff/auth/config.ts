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

import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
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
          const user = JSON.parse(credentials.user) as AuthenticatedUserBase;
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
  // JWT戦略を使用してステートレスな認証を実現
  // - セッション情報はJWTトークンとしてCookieに保存
  // - サーバーサイドでセッション情報を保持しない（ステートレス）
  session: {
    strategy: 'jwt' as const, // JWTを使用したセッション管理
    maxAge: 7 * 24 * 60 * 60, // セッションの有効期限（7日間）
  },
  // Cookieのセキュリティ設定
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,      // JavaScriptからのアクセスを防止
        secure: true,        // HTTPSのみで送信
        sameSite: 'lax' as const,  // CSRF対策（lax: 同一サイトとGETリクエストを許可）
        path: '/',           // すべてのパスで有効
        maxAge: 7 * 24 * 60 * 60,  // 7日間有効（セッション設定と合わせる）
      },
    },
    // CSRFトークン用のCookie設定
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,      // JavaScriptからのアクセスを防止
        secure: true,        // HTTPSのみで送信
        sameSite: 'lax' as const,  // CSRF対策
        path: '/',           // すべてのパスで有効
      },
    },
  },
  // カスタムページのパス設定
  // Auth.js v5ではデフォルトの認証ページは提供されないため、
  // アプリケーション独自の認証ページを指定する必要がある
  pages: {
    signIn: '/login', // ログインページのパス
    // 未認証ユーザーが保護されたページにアクセスした時や
    // セッションが切れた時に /login にリダイレクト
  },
  // 認証フローのカスタマイズ
  // セッションとJWTの関係：
  // - セッションはJWTトークンから安全に抽出された情報を提供するインターフェース
  // - JWTトークンは暗号化され、Cookieに保存される
  // - クライアントは生のJWTトークンに直接アクセスできない
  // - セッションのuserオブジェクトのみがクライアント側で利用可能
  //
  // auth()関数の動作：
  // 1. クッキーからJWTトークンを取得
  // 2. JWTトークンを検証（署名の確認、有効期限の確認など）
  // 3. 検証済みのJWTトークンから情報を抽出
  // 4. sessionコールバックを通じてセッション情報を生成
  // セッション情報は永続化されず、毎回のリクエストでJWTトークンから動的に生成される
  callbacks: {
    // JWTトークンが作成・更新される際に呼ばれる
    // authorize関数で返却されたユーザー情報をJWTトークンに追加
    async jwt({ token, user }: { token: JWT, user: any }) {
      if (user && typeof user === 'object' && 'id' in user && 'role' in user) {
        const typedUser = user as AuthenticatedUserBase;
        // ユーザー情報をJWTトークンに追加（この情報は暗号化される）
        token.userId = typedUser.id;
        token.role = typedUser.role;
      }
      return token;
    },
    // セッション情報が生成される際に呼ばれる
    // auth()関数が呼ばれるたびに、JWTトークンから情報を抽出してセッションを生成
    async session({ session, token }: { session: Session, token: JWT }) {
      if (session.user) {
        // JWTトークンから安全に抽出した情報をセッションのuser objectに追加
        // この情報のみがクライアント側で利用可能
        session.user.id = token.userId;
        session.user.role = token.role;
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