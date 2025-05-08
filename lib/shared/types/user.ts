/**
 * ユーザー関連の型定義
 */

export interface User {
  id: string;
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}