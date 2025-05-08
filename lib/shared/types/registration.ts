/**
 * ユーザー登録関連の型定義
 */

// 登録情報
export type RegisterCredentials = {
  userId: string;
  email: string;
  password: string;
  confirmPassword: string;
};

// 登録レスポンス
export type RegisterResponse = {
  id: string;
  userId: string;
  email: string;
  role: string;
}; 