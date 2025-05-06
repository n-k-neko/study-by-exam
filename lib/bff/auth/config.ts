import NextAuth, { type AuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Session, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthResponse } from '@/lib/shared/types/auth';

type CustomUser = {
  id: string;
  role: string;
};

declare module 'next-auth' {
  interface User extends CustomUser {}

  interface Session {
    user: CustomUser & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
  }
}

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set');
}

export const config = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      // バックエンドAPIで認証済みのユーザー情報のみを受け取る
      credentials: {
        user: { label: "User", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.user) {
          return null;
        }

        try {
          const user = JSON.parse(credentials.user) as AuthResponse;
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
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7日間
  },
  pages: {
    signIn: '/login',
    signOut: '/logout'
  },
  // NextAuth.jsの認証フローをカスタマイズするためのコールバック関数群
  callbacks: {
    // JWTトークンが作成・更新される際に呼ばれる
    // 認証時のユーザー情報をJWTに追加する
    async jwt({ token, user }: { token: JWT, user: any }) {
      if (user && typeof user === 'object' && 'id' in user && 'role' in user) {
        const typedUser = user as CustomUser;
        token.userId = typedUser.id;
        token.role = typedUser.role;
      }
      return token;
    },
    // クライアントにセッション情報が渡される際に呼ばれる
    // JWTの情報をセッションのuser objectに追加する
    async session({ session, token }: { session: Session, token: JWT }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  // 開発環境でのみデバッグログを有効にする
  // true: 認証フローの詳細なログを出力
  // false: 最小限のログのみ出力
  debug: process.env.NODE_ENV === 'development',
  // JWTの署名と暗号化に使用する秘密鍵
  // 環境変数AUTH_SECRETから取得
  // 注意: 本番環境では32文字以上のランダムな文字列を使用すること
  secret: process.env.AUTH_SECRET
} as unknown as AuthOptions;

export const { handlers, auth, signIn, signOut } = NextAuth(config as AuthOptions); 