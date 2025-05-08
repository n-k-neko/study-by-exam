/**
 * APIリクエストのオプション
 */
export interface RequestOptions {
  timeout?: number;  // タイムアウト秒数（ミリ秒）
  retry?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
  };
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeout?: number;
  };
  headers?: Record<string, string>;
} 