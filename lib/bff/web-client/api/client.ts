import { defaultApiConfig, getApiConfig } from '@/lib/bff/web-client/config/api';
import type { ResilienceConfig } from '@/lib/bff/web-client/types/config';
import type { RequestOptions } from '@/lib/bff/web-client/types/request';
import type { ApiResponse } from '@/lib/bff/web-client/types/response';
import type { CacheOptions } from '@/lib/bff/web-client/types/cache';
import { 
  Policy, 
  retry, 
  timeout, 
  circuitBreaker, 
  handleAll,
  ExponentialBackoff,
  ConsecutiveBreaker,
  TimeoutStrategy 
} from 'cockatiel';

/**
 * ドメインから設定を取得
 */
function getDomainConfig(url: string): ResilienceConfig {
  const urlObj = new URL(url);
  const domain = urlObj.host;
  const config = getApiConfig();
  return config[domain] || defaultApiConfig;
}

// ドメインごとのポリシーを保持するMap
const policies = new Map<string, any>();

/**
 * ドメインに対応するポリシーを取得
 * 存在しない場合は新規作成
 */
function getPolicy(domain: string, config: ResilienceConfig, timeoutMs: number) {
  const key = `${domain}-${timeoutMs}`;
  if (!policies.has(key)) {
    const retryPolicy = retry(handleAll, {
      maxAttempts: config.retry.maxAttempts,
      backoff: new ExponentialBackoff({
        maxDelay: config.retry.maxDelay,
      }),
    });
    
    // Correct timeout usage with TimeoutStrategy
    const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Cooperative);
    
    const cbPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: config.circuitBreaker.resetTimeout,
      breaker: new ConsecutiveBreaker(config.circuitBreaker.failureThreshold),
    });
    
    // Manual policy combination
    const policy = {
      execute: async (fn: () => Promise<any>) => {
        return await retryPolicy.execute(() =>
          timeoutPolicy.execute(() =>
            cbPolicy.execute(fn)
          )
        );
      }
    };
    
    policies.set(key, policy);
  }
  return policies.get(key)!;
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
 *   revalidate: 60,
 *   tags: ['users']
 * });
 * 
 * // リクエスト設定のみ指定
 * await fetchApi<User>('/api/users', {
 *   timeout: 5000,
 *   retryCount: 3,
 *   retryDelay: 1000
 * });
 * 
 * // 両方の設定を指定
 * await fetchApi<User>('/api/users', {
 *   // キャッシュ設定
 *   revalidate: 60,
 *   tags: ['users'],
 *   // リクエスト設定
 *   timeout: 5000,
 *   retryCount: 3,
 *   retryDelay: 1000
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
  // RequestInitは、fetch APIの標準的なオプション（method, headers, bodyなど）
  // 必要な項目のみを指定可能。すべてのプロパティはオプショナル。
  options: CacheOptions & RequestOptions & RequestInit = {}
): Promise<ApiResponse<T>> {
  const domainConfig = getDomainConfig(url);
  const domain = new URL(url).host;
  const timeout = options.timeout || domainConfig.timeout;
  
  // Cockatielのポリシーを取得（リトライ、タイムアウト、サーキットブレーカーを含む）
  const policy = getPolicy(domain, domainConfig, timeout);

  // Cockatielのポリシーを使用してリクエストを実行
  const { timeout: timeoutOpt, ...fetchOptions } = options;

  const response = await policy.execute(() =>
    fetch(url, fetchOptions)
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
} 