'use server';

import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/lib/bff/auth/auth';
import { loginSchema } from '@/lib/shared/validation/auth';
import { registerSchema } from '@/lib/shared/validation/registration';
import type { LoginCredentials } from '@/lib/shared/types/auth';
import type { RegisterCredentials } from '@/lib/shared/types/registration';
import { userApi } from '@/lib/bff/web-client/user';

interface ActionState {
  error?: string;
  errors?: Record<string, { message: string }>;
}

export async function login(
  prevState: ActionState | null,
  data: FormData
): Promise<ActionState> {
  const formData: LoginCredentials = {
    userId: data.get('userId') as string,
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
    const response = await userApi.login(formData);
    
    // 認証が失敗した場合
    if (!response.user) {
      return { error: '認証に失敗しました' };
    }

    const user = response.user;  // { id: 'abc', role: 'USER' } （オブジェクト形式）

    // 認証済みのユーザー情報を基にNextAuthのセッションを作成
    const signInResult = await signIn('credentials', {
      // NextAuthのCredentialsProviderは文字列形式のデータしか受け付けないため、
      // ユーザー情報をJSON文字列に変換して渡す
      // 例: { id: 'abc', role: 'USER' } → '{"id":"abc","role":"USER"}'
      // authorize関数側でJSON.parseして再度オブジェクトに戻して処理する
      user: JSON.stringify(user),
      redirect: false
    });

    if (signInResult?.error) {
      return { error: 'セッションの作成に失敗しました' };
    }

    // セッションの確認
    const session = await auth();
    if (!session?.user) {
      return { error: 'セッションの作成に失敗しました' };
    }

    // 認証成功後、明示的にホーム画面にリダイレクト
    redirect('/home');
  } catch (error: any) {
    // NEXT_REDIRECTエラーは無視（正常な動作）
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return { error: '認証に失敗しました' };
  }
}

export async function register(
  prevState: ActionState | null,
  data: FormData
): Promise<ActionState> {
  const formData: RegisterCredentials = {
    userId: data.get('userId') as string,
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
    const user = await userApi.register(formData);

    // NextAuth.jsでの認証
    const signInResult = await signIn('credentials', {
      user: JSON.stringify(user),
      // Server Actionでリダイレクトを制御するため、自動リダイレクトを無効化
      redirect: false
    });

    if (signInResult?.error) {
      return { error: 'サインインに失敗しました' };
    }

    const session = await auth();
    if (!session?.user) {
      return { error: 'セッションの作成に失敗しました' };
    }

    // 認証成功後、明示的にホーム画面にリダイレクト
    redirect('/home');
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