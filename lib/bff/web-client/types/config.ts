/**
 * APIの共通設定
 */
export interface ApiConfig {
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
   * ドメインごとのAPI設定
   */
  export interface DomainConfig {
    [domain: string]: ApiConfig;
  } 