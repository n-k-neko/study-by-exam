'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/lib/bff/server-actions/userActions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginCredentials } from '@/lib/shared/validation/auth';
import { useMemo } from 'react';
import { startTransition } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-5 py-4 mt-6 text-lg font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
    >
      {pending ? 'ログイン中...' : 'ログイン'}
    </button>
  );
}

// メモ化されたエラーメッセージコンポーネント
const ErrorMessage = ({ error }: { error: { message?: string } }) => (
  <p className="mt-2 text-base text-red-500 font-medium">{error.message}</p>
);

export function LoginForm() {
  const [serverState, formAction] = useFormState(login, null);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  const onSubmit = handleSubmit((data: LoginCredentials) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    startTransition(() => {
      formAction(formData);
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div>
        <label htmlFor="loginId" className="block text-xl font-bold text-blue-900">
          ユーザーIDまたはメールアドレス
        </label>
        <div className="mt-2">
          <input
            id="loginId"
            {...register('loginId')}
            type="text"
            autoComplete="username"
            className="appearance-none block w-full px-5 py-4 border-2 border-blue-200 rounded-xl shadow-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white"
            placeholder="ユーザーIDまたはメールアドレス"
            aria-invalid={!!errors.loginId}
            aria-describedby={errors.loginId ? "loginId-error" : undefined}
          />
          {errors.loginId && (
            <p id="loginId-error" role="alert">
              {errors.loginId.message}
            </p>
          )}
          {serverState?.errors?.loginId && (
            <ErrorMessage error={serverState.errors.loginId} />
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
            autoComplete="current-password"
            className="appearance-none block w-full px-5 py-4 border-2 border-blue-200 rounded-xl shadow-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-white"
            placeholder="パスワード"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" role="alert">
              {errors.password.message}
            </p>
          )}
          {serverState?.errors?.password && (
            <ErrorMessage error={serverState.errors.password} />
          )}
        </div>
      </div>

      {serverState?.error && (
        <div className="text-center">
          <ErrorMessage error={{ message: serverState.error }} />
        </div>
      )}

      <div className="text-center">
        <SubmitButton />
      </div>

      <div className="text-center mt-4">
        <a href="/password-reset" className="text-lg font-bold text-blue-900 hover:text-blue-700 underline">
          パスワードをお忘れですか？
        </a>
      </div>
    </form>
  );
} 