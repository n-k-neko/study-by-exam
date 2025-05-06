import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import authConfig from './auth.config';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export const GET = handlers.GET;
export const POST = handlers.POST; 