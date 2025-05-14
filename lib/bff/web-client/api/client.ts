import { defaultApiConfig, getApiConfig } from '@/lib/bff/web-client/config/api';
import type { ApiConfig } from '@/lib/bff/web-client/types/config';
import type { RequestOptions } from '@/lib/bff/web-client/types/request';
import type { ApiResponse } from '@/lib/bff/web-client/types/response';
import type { CacheOptions } from '@/lib/bff/web-client/types/cache';

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
 * 
 * @example
 * // オプションを省略（デフォルト設定を使用）
 * await fetchApi<User>('/api/users');
 * 
 * // キャッシュ設定のみ指定
 * await fetchApi<User>('/api/users', {
 *   // キャッシュの有効期限を60秒に設定
 *   // 60秒経過後、次のリクエスト時にバックグラウンドで再検証
 *   revalidate: 60,
 *   
 *   // キャッシュタグを指定
 *   // 特定のタグに関連するキャッシュを一括で無効化可能
 *   // 例：ユーザー情報が更新された際に'users'タグのキャッシュを無効化
 *   tags: ['users']
 * });
 * 
 * // リクエスト設定のみ指定
 * await fetchApi<User>('/api/users', {
 *   // リクエストのタイムアウト時間を5秒に設定
 *   // 5秒以内にレスポンスがない場合、リクエストを中断
 *   timeout: 5000,
 *   
 *   // リクエスト失敗時のリトライ回数を3回に設定
 *   // 3回まで自動的にリトライを試みる
 *   retryCount: 3,
 *   
 *   // リトライ間隔を1秒に設定
 *   // リトライ間隔は指数バックオフで増加（1秒→2秒→4秒）
 *   retryDelay: 1000
 * });
 * 
 * // 両方の設定を指定
 * await fetchApi<User>('/api/users', {
 *   // キャッシュ設定
 *   revalidate: 60,  // 60秒後にキャッシュを再検証
 *   tags: ['users'], // ユーザー情報のキャッシュタグ
 *   
 *   // リクエスト設定
 *   timeout: 5000,    // 5秒でタイムアウト
 *   retryCount: 3,    // 3回までリトライ
 *   retryDelay: 1000  // 1秒間隔でリトライ
 * });
 */
export async function fetchApi<T>(
  url: string,
  // デフォルトは空のオブジェクト。つまり、optionsパラメータは省略可能。
  // CacheOptionsは、Next.jsのfetch APIで使用するキャッシュ設定の型定義（業務ドメインの関心事）
  //   - revalidate: キャッシュの有効期限（秒）
  //   - tags: キャッシュの無効化に使用するタグ
  // RequestOptionsは、リクエストのタイムアウトやリトライなどの設定の型定義（インフラ層の関心事）
  //   - timeout: リクエストのタイムアウト時間（ミリ秒）
  //   - retryCount: リトライ回数
  //   - retryDelay: リトライ間隔（ミリ秒）
  // 必要な項目のみを指定可能。すべてのプロパティはオプショナル。
  options: CacheOptions & RequestOptions = {}
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