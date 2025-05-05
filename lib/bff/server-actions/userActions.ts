'use server';

import { redirect } from 'next/navigation';
import { loginSchema, type LoginFormData, registerSchema, type RegisterFormData } from '@/lib/shared/validation/auth';

export async function login(prevState: { error?: string; errors?: Record<string, { message: string }> } | null, data: FormData) {
  const formData = {
    loginId: data.get('loginId') as string,
    password: data.get('password') as string,
  };
  
  const validated = loginSchema.safeParse(formData);
  if (!validated.success) {
    // エラーメッセージをフィールドごとにマッピング
    const errors = validated.error.errors.reduce((acc, err) => {
      const field = err.path[0] as string;
      acc[field] = { message: err.message };
      return acc;
    }, {} as Record<string, { message: string }>);
    
    return { errors };
  }

  try {
    // TODO: 実際のログイン処理を実装
    // 成功時はリダイレクト
    redirect('/home');
  } catch (error) {
    return { error: '認証に失敗しました' };
  }
}

export async function register(prevState: { error?: string; errors?: Record<string, { message: string }> } | null, data: FormData) {
  const formData = {
    userId: data.get('userId') as string,
    email: data.get('email') as string,
    password: data.get('password') as string,
    confirmPassword: data.get('confirmPassword') as string,
  };

  const validated = registerSchema.safeParse(formData);
  if (!validated.success) {
    // エラーメッセージをフィールドごとにマッピング
    const errors = validated.error.errors.reduce((acc, err) => {
      const field = err.path[0] as string;
      acc[field] = { message: err.message };
      return acc;
    }, {} as Record<string, { message: string }>);
    
    return { errors };
  }

  try {
    // TODO: 実際の登録処理を実装
    // 成功時はリダイレクト
    redirect('/login');
  } catch (error) {
    return { error: '登録に失敗しました' };
  }
} 