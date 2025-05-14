/**
 * HTTP通信の耐障害性設定
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
 * ドメインごとの耐障害性設定
 */
export interface DomainResilienceConfig {
    [domain: string]: ResilienceConfig;
} 