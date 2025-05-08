/**
 * APIレスポンス
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
} 