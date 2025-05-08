import { z } from 'zod';

/**
 * ログイン認証のバリデーションスキーマ
 */
export const loginSchema = z.object({
  loginId: z.string()
    .min(3, 'ユーザーIDまたはメールアドレスは3文字以上である必要があります')
    .max(50, 'ユーザーIDまたはメールアドレスは50文字以下である必要があります'),
  password: z.string()
    .min(8, 'パスワードは8文字以上である必要があります'),
});

/**
 * ログイン認証情報の型定義
 * Zodスキーマから生成された型
 */
export type LoginCredentials = z.infer<typeof loginSchema>; 