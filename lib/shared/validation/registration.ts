/**
 * ユーザー登録のバリデーションスキーマ
 * 
 * 注意: 型定義は /lib/shared/types/registration.ts で行います。
 * 理由:
 * 1. 型定義の一元管理: すべての型を /lib/shared/types で管理することで、
 *    型の参照が容易になり、重複を防ぐことができます。
 * 2. 責務の分離: バリデーションロジックと型定義を分離することで、
 *    コードの保守性と可読性が向上します。
 * 3. 型の生成: 型は Zod スキーマから生成され、/lib/shared/types で
 *    エクスポートされます。これにより、型の整合性が保証されます。
 */
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