/**
 * 認証関連のバリデーションスキーマ
 * 
 * 注意: 型定義は /lib/shared/types/auth.ts で行います。
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
 * ログイン認証情報のスキーマ
 */
export const loginSchema = z.object({
  loginId: z.string()
    .min(3, 'ユーザーIDまたはメールアドレスは3文字以上で入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください'),
});

/**
 * 認証レスポンスのスキーマ
 */
export const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.string(),
  }),
}); 