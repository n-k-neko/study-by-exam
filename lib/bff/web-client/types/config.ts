/**
 * HTTP通信の回復力設定
 */
export interface ResilienceConfig {
    timeout: number;
    retry: {
        maxAttempts: number;
        initialDelay: number;
        maxDelay: number;
    };
    circuitBreaker: {
        failureThreshold: number;
        resetTimeout: number;
    };
}
  
/**
 * ドメインごとの回復力設定
 */
export interface DomainResilienceConfig {
    [domain: string]: ResilienceConfig;
} 