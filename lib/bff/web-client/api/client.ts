import { defaultApiConfig, getApiConfig } from '@/lib/bff/web-client/config/api';
import type { ApiConfig } from '@/lib/bff/web-client/types/config';
import type { RequestOptions } from '@/lib/bff/web-client/types/request';
import type { ApiResponse } from '@/lib/bff/web-client/types/response';

/**
 * ドメインから設定を取得
 */
function getDomainConfig(url: string): ApiConfig {
  const urlObj = new URL(url);
  const domain = urlObj.host;  // hostname + port
  const config = getApiConfig();
  return config[domain] || defaultApiConfig;
}

/**
 * リトライ処理
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: ApiConfig
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.retry.initialDelay;

  for (let attempt = 1; attempt <= config.retry.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === config.retry.maxAttempts) break;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, config.retry.maxDelay);
    }
  }

  throw lastError;
}

/**
 * サーキットブレーカー
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private isOpen = false;

  constructor(private config: ApiConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.config.circuitBreaker.resetTimeout) {
        this.isOpen = false;
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.config.circuitBreaker.failureThreshold) {
        this.isOpen = true;
      }
      
      throw error;
    }
  }
}

/**
 * APIリクエストを実行
 */
export async function fetchApi<T>(
  url: string,
  options: RequestInit & RequestOptions = {}
): Promise<ApiResponse<T>> {
  const domainConfig = getDomainConfig(url);
  const circuitBreaker = new CircuitBreaker(domainConfig);

  const timeout = options.timeout || domainConfig.timeout;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await withRetry(
      () => circuitBreaker.execute(() =>
        fetch(url, {
          ...options,
          signal: controller.signal,
        })
      ),
      domainConfig
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  } finally {
    clearTimeout(timeoutId);
  }
} 