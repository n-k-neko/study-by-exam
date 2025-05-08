/**
 * APIレスポンスの共通型定義
 * 
 * 成功時と失敗時の両方のケースを表現するユニオン型
 * 
 * @template T - 成功時に返されるデータの型
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
}; 