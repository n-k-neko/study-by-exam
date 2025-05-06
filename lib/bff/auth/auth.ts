import NextAuth, { type AuthOptions } from 'next-auth';
import type { DefaultSession } from 'next-auth';
import { config } from './config';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(config);

export const GET = handlers.GET;
export const POST = handlers.POST; 