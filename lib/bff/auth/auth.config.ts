import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthResponse } from '@/lib/shared/types/auth';

// 開発環境用の固定の秘密鍵（本番環境では必ず環境変数を使用してください）
const dev = process.env.NODE_ENV !== 'production';
const defaultSecret = 'this-is-a-development-secret-value-with-at-least-32-characters';

const authConfig = {
  debug: dev,
  secret: process.env.AUTH_SECRET ?? defaultSecret,
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        loginId: { label: "Login ID", type: "text" },
        password: { label: "Password", type: "password" },
        user: { label: "User", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.user) {
            console.error('No user data in credentials');
            return null;
          }

          const user = JSON.parse(credentials.user) as AuthResponse;
          console.log('Parsed user data:', user);

          if (!user.id || !user.role) {
            console.error('Invalid user data:', user);
            return null;
          }

          return {
            id: user.id,
            role: user.role
          };
        } catch (error) {
          console.error('Error in authorize:', error);
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
    signOut: '/logout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT, user: any }) {
      if (user) {
        console.log('JWT callback - user:', user);
        token.userId = user.id;
        token.role = user.role;
      }
      console.log('JWT callback - token:', token);
      return token;
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      console.log('Session callback - token:', token);
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      console.log('Session callback - session:', session);
      return session;
    },
    async redirect({ url, baseUrl }: { url: string, baseUrl: string }) {
      // ログイン後のデフォルトリダイレクト先
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    }
  }
} as const;

export default authConfig; 