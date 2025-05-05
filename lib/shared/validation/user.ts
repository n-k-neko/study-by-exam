import { z } from 'zod';

// サーバーサイド用の登録スキーマ
export const userRegisterSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  userId: z.string().min(1, 'ユーザーIDを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

// クライアントサイド用の登録スキーマ
export const userRegisterFormSchema = userRegisterSchema.extend({
  confirmPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export const userLoginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

export const userPasswordResetRequestSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

export const userPasswordResetConfirmSchema = z.object({
  token: z.string().min(1, 'トークンは必須です'),
  newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  confirmPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
}); 