/**
 * APIクライアント実装モジュール
 *
 * このモジュールは外部APIへのHTTPリクエスト実行機能を提供します。
 * 主な責務:
 * - HTTPリクエストの実行とレスポンス処理
 * - Cockatielライブラリを使用した耐障害性機能の実装
 *   - リトライ
 *   - タイムアウト
 *   - サーキットブレーカー
 * - ポリシーの生成と実行
 * 
 * 設計方針:
 * - ドメインごとのポリシーをメモリにキャッシュし、再利用
 * - リトライとサーキットブレーカーはドメイン単位で共有（同じドメインへのリクエストは同じポリシーを使用）
 * - タイムアウトはリクエストごとに個別に設定可能
 * 
 * 設計根拠:
 * - ポリシー生成ロジックはHTTPクライアントと密接に関連しているため本ファイルに配置
 * - 設定値の取得(resilience.ts)とポリシー実装(client.ts)を分離することで関心の分離を実現
 * - リクエスト実行時のコンテキスト（タイムアウト値など）に依存するため、実行コードと同じ場所に配置
 */

import { getDomainResilienceConfig } from '@/lib/bff/web-client/config/resilience';
import type { ResilienceConfig } from '@/lib/bff/web-client/types/resilience';
import type { RequestOptions } from '@/lib/bff/web-client/types/request';
import type { ApiResponse } from '@/lib/bff/web-client/types/response';
import type { CacheOptions } from '@/lib/bff/web-client/types/cache';
import { 
  retry, 
  timeout, 
  circuitBreaker, 
  handleAll,
  ExponentialBackoff,
  ConsecutiveBreaker,
  TimeoutStrategy,
  RetryPolicy,
  CircuitBreakerPolicy
} from 'cockatiel';

/**
 * ドメインごとのポリシーキャッシュ
 * 
 * ドメインのみをキーとして、リトライとサーキットブレーカーを共有します。
 * 同じドメインへのリクエストは、同じリトライポリシーとサーキットブレーカーを使用します。
 * これにより、サーキットブレーカーの状態共有が可能になり、障害検出が向上します。
 */
const policies = new Map<string, {
  retry: RetryPolicy;
  circuitBreaker: CircuitBreakerPolicy;
}>();

/**
 * ドメインに対応するCockatielのポリシーを取得
 * 存在しない場合は新規作成
 * 
 * @param domain - ターゲットドメイン (例: "api.example.com")
 * @param config - ドメインに対応する回復力設定
 * @param timeoutMs - タイムアウト時間（ミリ秒）
 * @returns 複合ポリシーオブジェクト（execute関数を含む）
 */
function getPolicy(domain: string, config: ResilienceConfig, timeoutMs: number) {
  if (!policies.has(domain)) {
    // リトライとサーキットブレーカーはドメインで共有
    const retryPolicy = retry(handleAll, {
      maxAttempts: config.retry.maxAttempts, // 最大リトライ回数
      backoff: new ExponentialBackoff({
        maxDelay: config.retry.maxDelay, // 最大遅延時間（指数バックオフで増加）
      }),
    });
    
    const cbPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: config.circuitBreaker.resetTimeout, // サーキットがハーフオープンになるまでの時間
      breaker: new ConsecutiveBreaker(config.circuitBreaker.failureThreshold), // 連続失敗閾値
    });
    
    policies.set(domain, { retry: retryPolicy, circuitBreaker: cbPolicy });
  }
  
  const { retry: retryPolicy, circuitBreaker: cbPolicy } = policies.get(domain)!;
  // タイムアウトのみリクエストごとに作成（各リクエストで異なる値が設定可能）
  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Cooperative);
  
  return {
    // ポリシーを組み合わせた実行関数
    // 内側から外側へ: サーキットブレーカー → タイムアウト → リトライ
    execute: async (fn: () => Promise<any>) => 
      retryPolicy.execute(() =>
        timeoutPolicy.execute(() =>
          cbPolicy.execute(fn)
        )
      )
  };
}

/**
 * APIリクエストを実行
 * 
 * この関数は、Next.jsのfetch APIをベースにして、リトライ、タイムアウト、
 * サーキットブレーカーの機能を追加したHTTPリクエスト関数です。
 * 
 * @typeParam T - レスポンスデータの型
 * @param url - リクエスト先のURL
 * @param options - リクエストオプション（キャッシュ、タイムアウト、標準fetchオプション）
 * @returns APIレスポンスオブジェクト（データ、ステータス、ヘッダーを含む）
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
 * });
 * 
 * // 両方の設定を指定
 * await fetchApi<User>('/api/users', {
 *   // キャッシュ設定
 *   revalidate: 60,
 *   tags: ['users'],
 *   // リクエスト設定
 *   timeout: 5000,
 * });
 */
export async function fetchApi<T>(
  url: string,
  // デフォルトは空のオブジェクト。つまり、optionsパラメータは省略可能。
  // CacheOptionsは、Next.jsのfetch APIで使用するキャッシュ設定の型定義（業務ドメインの関心事）
  //   - revalidate: キャッシュの有効期限（秒）
  //   - tags: キャッシュの無効化に使用するタグ
  // RequestOptionsは、リクエストのタイムアウトの設定の型定義（インフラ層の関心事）
  // リトライ、サーキットブレーカなどは、ドメインごとの設定を環境変数から読み込む。
  //   - timeout: リクエストのタイムアウト時間（ミリ秒）
  // RequestInitは、fetch APIの標準的なオプション（method, headers, bodyなど）
  // 必要な項目のみを指定可能。すべてのプロパティはオプショナル。
  options: CacheOptions & RequestOptions & RequestInit = {}
): Promise<ApiResponse<T>> {
  // ドメインに対応する耐障害性設定を取得
  const domainConfig = getDomainResilienceConfig(url);
  const domain = new URL(url).host;
  const timeout = options.timeout || domainConfig.timeout;
  
  // Cockatielのポリシーを取得（リトライ、タイムアウト、サーキットブレーカーを含む）
  const policy = getPolicy(domain, domainConfig, timeout);

  // タイムアウトオプションを取り除いたfetchオプションを作成
  const { timeout: timeoutOpt, ...fetchOptions } = options;

  // ポリシーを適用してリクエストを実行
  const response = await policy.execute(() =>
    fetch(url, fetchOptions)
  );

  // エラーレスポンス（4xx、5xx）をハンドリング
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