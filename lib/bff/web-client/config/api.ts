import type { ResilienceConfig, DomainResilienceConfig } from '@/lib/bff/web-client/types/config';

/**
 * デフォルトのResilience設定
 * （タイムアウト、リトライ、サーキットブレーカー）
 */
export const defaultResilienceConfig: ResilienceConfig = {
  timeout: 5000,
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },
};

/**
 * 環境変数からAPI設定を読み込む
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
 * シングルトンとして設定を保持
 */
let apiConfig: DomainResilienceConfig | null = null;

/**
 * API設定を取得
 */
export function getResilienceConfig(): DomainResilienceConfig {
  if (!apiConfig) {
    apiConfig = loadResilienceConfig();
  }
  return apiConfig;
} 