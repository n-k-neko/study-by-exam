/**
 * APIリクエストのオプション
 */
export interface RequestOptions {
    timeout?: number
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