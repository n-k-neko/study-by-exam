'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { register as registerAction } from '@/lib/bff/server-actions/userActions';
import { registerSchema } from '@/lib/shared/validation/auth';
import { useState, useCallback, useMemo } from 'react';
import type { z } from 'zod';

// SubmitButtonを別コンポーネントとして分離（useFormStatusのため）
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-5 px-4 border-0 rounded-xl shadow-lg text-2xl font-black text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          登録中...
        </span>
      ) : (
        '新規登録'
      )}
    </button>
  );
}

type FormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [serverState, formAction] = useFormState(registerAction, null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger
  } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur'
  });

  // Server ActionsとReact Hook Formを橋渡しする関数
  const onSubmit = async (data: FormData) => {
    const formData = new FormData();
    // React Hook FormのオブジェクトをFormDataに変換
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    // Server Actionを実行
    await formAction(formData);
  };

  // メモ化されたエラーメッセージコンポーネント
  const ErrorMessage = useMemo(() => {
    return ({ error }: { error: { message?: string } }) => (
      <p className="mt-2 text-base text-red-500 font-medium">{error.message}</p>
    );
  }, []);

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} role="form" aria-label="ユーザー登録フォーム">
      <div role="group" aria-labelledby="userId-label">
        <label id="userId-label" htmlFor="userId" className="block text-xl font-bold text-blue-900" aria-required="true">
          ユーザーID *
        </label>
        <div className="mt-2">
          <input
            id="userId"
            {...register('userId')}
            type="text"
            autoComplete="username"
            className="appearance-none block w-full px-5 py-4 border-2 border-blue-200 rounded-xl shadow-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white"
            placeholder="ユーザーID"
            aria-invalid={!!errors.userId}
            aria-describedby={errors.userId ? "userId-error" : undefined}
          />
          {errors.userId && (
            <p id="userId-error" role="alert">
              {errors.userId.message}
            </p>
          )}
          {serverState?.errors?.userId && (
            <ErrorMessage error={serverState.errors.userId} />
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-xl font-bold text-blue-900">
          メールアドレス
        </label>
        <div className="mt-2">
          <input
            id="email"
            {...register('email')}
            type="email"
            autoComplete="email"
            className="appearance-none block w-full px-5 py-4 border-2 border-blue-200 rounded-xl shadow-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white"
            placeholder="メールアドレス"
          />
          {errors.email && (
            <ErrorMessage error={errors.email} />
          )}
          {serverState?.errors?.email && (
            <ErrorMessage error={serverState.errors.email} />
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-xl font-bold text-blue-900">
          パスワード
        </label>
        <div className="mt-2">
          <input
            id="password"
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className="appearance-none block w-full px-5 py-4 border-2 border-blue-200 rounded-xl shadow-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white"
            placeholder="パスワード"
          />
          {errors.password && (
            <ErrorMessage error={errors.password} />
          )}
          {serverState?.errors?.password && (
            <ErrorMessage error={serverState.errors.password} />
          )}
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-xl font-bold text-blue-900">
          パスワード（確認）
        </label>
        <div className="mt-2">
          <input
            id="confirmPassword"
            {...register('confirmPassword')}
            type="password"
            autoComplete="new-password"
            className="appearance-none block w-full px-5 py-4 border-2 border-blue-200 rounded-xl shadow-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white"
            placeholder="パスワード（確認）"
          />
          {errors.confirmPassword && (
            <ErrorMessage error={errors.confirmPassword} />
          )}
          {serverState?.errors?.confirmPassword && (
            <ErrorMessage error={serverState.errors.confirmPassword} />
          )}
        </div>
      </div>

      {serverState?.error && (
        <div className="text-center">
          <ErrorMessage error={{ message: serverState.error }} />
        </div>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
} 