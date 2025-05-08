import type { LoginCredentials } from '@/lib/shared/validation/auth';

/**
 * 認証関連の型定義
 */

// 認証レスポンス
export type AuthResponse = {
  id: string;
  role: string;
}; 