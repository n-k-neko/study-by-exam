'use server';

import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/lib/bff/auth/auth';
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
  console.log('login function called');
  const formData: LoginCredentials = {
    loginId: data.get('loginId') as string,
    password: data.get('password') as string,
  };
  console.log('formData:', formData);
  
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
    console.log('Attempting to login with UserClient');
    // バックエンドAPIで認証
    const user = await UserClient.login(formData);
    console.log('UserClient.login response:', user);

    // NextAuth.jsでの認証
    const signInResult = await signIn('credentials', {
      loginId: formData.loginId,
      password: formData.password,
      user: JSON.stringify(user),
      redirect: false,
      callbackUrl: '/home'
    });
    console.log('signIn result:', signInResult);

    if (signInResult?.error) {
      console.error('SignIn error:', signInResult.error);
      return { error: 'サインインに失敗しました' };
    }

    // セッションの確認
    const session = await auth();
    console.log('Current session:', session);

    if (!session?.user) {
      console.error('No session after signIn');
      return { error: 'セッションの作成に失敗しました' };
    }

    // 認証成功後のリダイレクト
    if (signInResult?.url) {
      redirect(signInResult.url);
    } else {
      redirect('/home');
    }
  } catch (error: any) {
    // NEXT_REDIRECTエラーは無視（正常な動作）
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Login error:', error);
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

    // NextAuth.jsでの認証
    const signInResult = await signIn('credentials', {
      loginId: formData.loginId,
      password: formData.password,
      user: JSON.stringify(user),
      redirect: false,
      callbackUrl: '/home'
    });

    if (signInResult?.error) {
      return { error: 'サインインに失敗しました' };
    }

    const session = await auth();
    if (!session?.user) {
      return { error: 'セッションの作成に失敗しました' };
    }

    if (signInResult?.url) {
      redirect(signInResult.url);
    } else {
      redirect('/home');
    }
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return { error: 'ユーザー登録に失敗しました' };
  }
}

export async function logout(): Promise<ActionState> {
  try {
    await signOut();
    redirect('/login');
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return { error: 'ログアウトに失敗しました' };
  }
  return {};
} 