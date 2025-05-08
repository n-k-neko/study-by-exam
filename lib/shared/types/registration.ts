import type { z } from 'zod';
import type { registerSchema } from '../validation/registration';

/**
 * ユーザー登録関連の型定義
 */

// 登録情報
export type RegisterCredentials = z.infer<typeof registerSchema>;

// 登録レスポンス
export type RegisterResponse = {
  id: string;
  userId: string;
  email: string;
  role: string;
}; 