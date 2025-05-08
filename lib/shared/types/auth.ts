import type { z } from 'zod';
import type { loginSchema, authResponseSchema } from '../validation/auth';

/**
 * ログイン認証情報
 */
export type LoginCredentials = z.infer<typeof loginSchema>;

/**
 * 認証レスポンス
 */
export type AuthResponse = z.infer<typeof authResponseSchema>; 