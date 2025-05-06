'use server';

import { redirect } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { loginSchema, registerSchema } from '@/lib/shared/validation/auth';
import type { LoginCredentials, RegisterCredentials } from '@/lib/shared/types/auth';
import { UserClient } from '../web-client/user';

interface ActionState {
  error?: string;
  errors?: Record<string, { message: string }>;
}

export async function login(
  prevState: ActionState | null,
  data: FormData
): Promise<ActionState> {
  const formData: LoginCredentials = {
    loginId: data.get('loginId') as string,
    password: data.get('password') as string,
  };
  
  const validated = loginSchema.safeParse(formData);
  if (!validated.success) {
    const errors = validated.error.errors.reduce((acc, err) => {
      const field = err.path[0] as string;
      acc[field] = { message: err.message };
      return acc;
    }, {} as Record<string, { message: string }>);
    
    return { errors };
  }

  try {
    // バックエンドAPIで認証
    const user = await UserClient.login(formData);

    // 認証成功後、NextAuthでJWTを作成
    const result = await signIn('credentials', {
      ...formData,
      user: JSON.stringify(user), // NextAuthのauthorizeコールバックに渡すためにユーザー情報を含める
      redirect: false
    });

    if (result?.error) {
      return { error: 'セッションの作成に失敗しました' };
    }

    redirect('/home');
  } catch (error) {
    return { error: '認証に失敗しました' };
  }
}

export async function register(
  prevState: ActionState | null,
  data: FormData
): Promise<ActionState> {
  const formData: RegisterCredentials = {
    loginId: data.get('userId') as string,
    email: data.get('email') as string,
    password: data.get('password') as string,
    confirmPassword: data.get('confirmPassword') as string,
  };

  const validated = registerSchema.safeParse(formData);
  if (!validated.success) {
    const errors = validated.error.errors.reduce((acc, err) => {
      const field = err.path[0] as string;
      acc[field] = { message: err.message };
      return acc;
    }, {} as Record<string, { message: string }>);
    
    return { errors };
  }

  try {
    // ユーザー登録APIの呼び出し
    const user = await UserClient.register(formData);

    // 登録成功後、NextAuthでJWTを作成
    const signInResult = await signIn('credentials', {
      loginId: formData.loginId,
      password: formData.password,
      user: JSON.stringify(user),
      redirect: false
    });

    if (signInResult?.error) {
      return { error: 'セッションの作成に失敗しました' };
    }

    redirect('/home');
  } catch (error) {
    return { error: 'ユーザー登録に失敗しました' };
  }
}

export async function logout(): Promise<ActionState> {
  try {
    await signOut({ redirect: false });
    redirect('/login');
  } catch (error) {
    return { error: 'ログアウトに失敗しました' };
  }
  return {};
} 