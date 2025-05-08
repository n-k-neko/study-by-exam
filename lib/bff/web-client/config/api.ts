import type { ApiConfig, DomainConfig } from '@/lib/shared/types/api/config';

/**
 * デフォルトのAPI設定
 */
export const defaultApiConfig: ApiConfig = {
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
function loadApiConfig(): DomainConfig {
  const config: DomainConfig = {};
  
  // 環境変数から設定を読み込む
  const domains = process.env.API_DOMAINS?.split(',') || [];
  
  domains.forEach(domain => {
    config[domain] = {
      timeout: Number(process.env[`${domain}_TIMEOUT`]) || defaultApiConfig.timeout,
      retry: {
        maxAttempts: Number(process.env[`${domain}_RETRY_MAX_ATTEMPTS`]) || defaultApiConfig.retry.maxAttempts,
        initialDelay: Number(process.env[`${domain}_RETRY_INITIAL_DELAY`]) || defaultApiConfig.retry.initialDelay,
        maxDelay: Number(process.env[`${domain}_RETRY_MAX_DELAY`]) || defaultApiConfig.retry.maxDelay,
      },
      circuitBreaker: {
        failureThreshold: Number(process.env[`${domain}_CIRCUIT_BREAKER_FAILURE_THRESHOLD`]) || defaultApiConfig.circuitBreaker.failureThreshold,
        resetTimeout: Number(process.env[`${domain}_CIRCUIT_BREAKER_RESET_TIMEOUT`]) || defaultApiConfig.circuitBreaker.resetTimeout,
      },
    };
  });

  return config;
}

/**
 * シングルトンとして設定を保持
 */
let apiConfig: DomainConfig | null = null;

/**
 * API設定を取得
 */
export function getApiConfig(): DomainConfig {
  if (!apiConfig) {
    apiConfig = loadApiConfig();
  }
  return apiConfig;
} 