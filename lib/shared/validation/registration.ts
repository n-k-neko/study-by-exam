import { z } from 'zod';

/**
 * ユーザー登録のバリデーションスキーマ
 */
export const registerSchema = z.object({
  userId: z.string()
    .min(3, 'ユーザーIDは3文字以上である必要があります')
    .max(20, 'ユーザーIDは20文字以下である必要があります')
    .regex(/^[a-zA-Z0-9_]+$/, 'ユーザーIDは英数字とアンダースコアのみ使用できます'),
  email: z.string()
    .email('有効なメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'パスワードは大文字、小文字、数字を含む必要があります'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export type RegisterCredentials = z.infer<typeof registerSchema>; 