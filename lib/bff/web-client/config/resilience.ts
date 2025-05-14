/**
 * 耐障害性設定管理モジュール
 *
 * このモジュールは外部APIアクセスの耐障害性機能の設定を管理します。
 * 主な責務:
 * - デフォルトの耐障害性設定の定義
 * - 環境変数からのドメインごとの設定の読み込み
 * - ドメインに応じた設定の提供
 * 
 * 設計方針:
 * - 設定値はドメインごとに管理（異なるAPIサービスに対して異なる設定が可能）
 * - 環境変数から動的に設定を読み込み（環境に応じた設定変更が容易）
 * - シングルトンパターンで設定をメモリに保持（頻繁なアクセスを最適化）
 * 
 * 注: 実際のポリシー生成と実行はAPIクライアント(client.ts)が担当
 */

import type { ResilienceConfig, DomainResilienceConfig } from '@/lib/bff/web-client/types/resilience';

/**
 * デフォルトのResilience設定
 * （タイムアウト、リトライ、サーキットブレーカー）
 * 
 * これらの値は環境変数で上書きされない場合のフォールバック値として使用されます。
 * すべてのドメインに共通する基本設定値です。
 */
const defaultResilienceConfig: ResilienceConfig = {
  timeout: 5000, // 5秒のタイムアウト
  retry: {
    maxAttempts: 3,    // 最大3回リトライ
    initialDelay: 1000, // 初回リトライまで1秒待機
    maxDelay: 5000,    // 最大5秒までの遅延（指数バックオフで増加）
  },
  circuitBreaker: {
    failureThreshold: 5,  // 5回連続失敗でサーキットブレーカーがオープン
    resetTimeout: 30000,  // 30秒後にハーフオープン状態に移行
  },
};

/**
 * シングルトンとして設定を保持
 * 
 * このアプリケーション内で一貫した設定を使用するため、
 * 設定は一度だけ読み込まれ、このモジュール変数に保持されます。
 * これにより、環境変数の読み込みやオブジェクト生成のオーバーヘッドを削減します。
 */
let resilienceConfig: DomainResilienceConfig | null = null;

/**
 * 環境変数からドメインごとのResilience設定を読み込む
 * 
 * API_DOMAINS環境変数からサポートするドメインのリストを取得し、
 * 各ドメインの設定を対応する環境変数から読み込みます。
 * 
 * 環境変数の命名規則:
 * - [ドメイン]_TIMEOUT: タイムアウト（ミリ秒）
 * - [ドメイン]_RETRY_MAX_ATTEMPTS: 最大リトライ回数
 * - [ドメイン]_RETRY_INITIAL_DELAY: 初期リトライ待機時間（ミリ秒）
 * - [ドメイン]_RETRY_MAX_DELAY: 最大リトライ待機時間（ミリ秒）
 * - [ドメイン]_CIRCUIT_BREAKER_FAILURE_THRESHOLD: サーキットブレーカーの失敗閾値
 * - [ドメイン]_CIRCUIT_BREAKER_RESET_TIMEOUT: サーキットブレーカーのリセット時間（ミリ秒）
 * 
 * @returns ドメインごとの設定オブジェクト
 */
function loadResilienceConfig(): DomainResilienceConfig {
  const config: DomainResilienceConfig = {};
  
  // 環境変数から設定を読み込む
  const domains = process.env.API_DOMAINS?.split(',') || [];
  
  domains.forEach(domain => {
    config[domain] = {
      timeout: Number(process.env[`${domain}_TIMEOUT`]) || defaultResilienceConfig.timeout,
      retry: {
        maxAttempts: Number(process.env[`${domain}_RETRY_MAX_ATTEMPTS`]) || defaultResilienceConfig.retry.maxAttempts,
        initialDelay: Number(process.env[`${domain}_RETRY_INITIAL_DELAY`]) || defaultResilienceConfig.retry.initialDelay,
        maxDelay: Number(process.env[`${domain}_RETRY_MAX_DELAY`]) || defaultResilienceConfig.retry.maxDelay,
      },
      circuitBreaker: {
        failureThreshold: Number(process.env[`${domain}_CIRCUIT_BREAKER_FAILURE_THRESHOLD`]) || defaultResilienceConfig.circuitBreaker.failureThreshold,
        resetTimeout: Number(process.env[`${domain}_CIRCUIT_BREAKER_RESET_TIMEOUT`]) || defaultResilienceConfig.circuitBreaker.resetTimeout,
      },
    };
  });

  return config;
}

/**
 * 環境設定をメモリから取得
 * 
 * キャッシュされたドメインごとの耐障害性設定を取得します。
 * 初回アクセス時のみ環境変数から設定を読み込み、以降はキャッシュから返します。
 * このシングルトンパターンにより、パフォーマンスを最適化します。
 * 
 * @returns すべてのドメインの設定を含むオブジェクト
 */
function getResilienceConfig(): DomainResilienceConfig {
  if (!resilienceConfig) {
    resilienceConfig = loadResilienceConfig();
  }
  return resilienceConfig;
}

/**
 * URLのドメインから耐障害性設定を取得
 * 
 * タイムアウト、リトライ、サーキットブレーカーの設定を
 * ドメインごとに取得し、見つからない場合はデフォルト設定を返します。
 * 
 * 使用例:
 * ```
 * // example.comドメインに対するリクエストの設定を取得
 * const config = getDomainResilienceConfig('https://example.com/api/resource');
 * ```
 * 
 * @param url リクエスト先のURL
 * @returns ドメインに対応するResilienceConfig
 */
export function getDomainResilienceConfig(url: string): ResilienceConfig {
  const urlObj = new URL(url);
  const domain = urlObj.host;
  const config = getResilienceConfig();
  return config[domain] || defaultResilienceConfig;
} 