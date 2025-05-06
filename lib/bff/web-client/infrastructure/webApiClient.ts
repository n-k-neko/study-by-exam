import { retry, handleAll, ExponentialBackoff, timeout, TimeoutStrategy, ConsecutiveBreaker, circuitBreaker, BrokenCircuitError } from 'cockatiel';
import { getEndpointUrl, getEndpointTimeout, getCircuitBreakerConfig, getRetryConfig } from '../endpoints';
import { IApiClient, CommonParams, CommonOptions, ApiEndpointKey, ApiEndpoints } from '../types';

/**
 * BFFからWebAPIアプリケーションへのリクエストのベース設定
 */
const baseConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// サーキットブレーカーのマップ（エンドポイントごとに保持）
const circuitBreakers = new Map<ApiEndpointKey, ReturnType<typeof circuitBreaker>>();

// ポリシー作成関数
const createPolicies = (endpointKey: ApiEndpointKey) => {
  const timeoutMs = getEndpointTimeout(endpointKey);
  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Aggressive);
  
  const retryConfig = getRetryConfig(endpointKey);
  const retryPolicy = retry(handleAll, {
    maxAttempts: retryConfig.maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay: retryConfig.backoff.initialDelay,
      maxDelay: retryConfig.backoff.maxDelay,
    }),
  });

  let breakerPolicy = circuitBreakers.get(endpointKey);
  if (!breakerPolicy) {
    const config = getCircuitBreakerConfig(endpointKey);
    breakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: config.duration,
      breaker: new ConsecutiveBreaker(config.threshold)
    });
    circuitBreakers.set(endpointKey, breakerPolicy);
  }

  return async <R>(fn: () => Promise<R>): Promise<R> => {
    return timeoutPolicy.execute(() => 
      breakerPolicy.execute(() => 
        retryPolicy.execute(fn)
      )
    );
  };
};

/**
 * WebAPIアプリケーションへのリクエストを行うクライアント
 */
export class WebApiClient implements IApiClient {
  user = this.createEndpointProxy<ApiEndpoints['user']>('user');
  exam = this.createEndpointProxy<ApiEndpoints['exam']>('exam');

  private createEndpointProxy<T extends Record<string, unknown>>(domain: string): T {
    return new Proxy({} as T, {
      get: (_, key: string) => ({
        get: <R>(params?: CommonParams, options?: CommonOptions) =>
          this.request<R>(key, 'GET', params, undefined, options),
        post: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          this.request<R>(key, 'POST', params, data, options),
        put: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          this.request<R>(key, 'PUT', params, data, options),
        delete: <R>(params?: CommonParams, options?: CommonOptions) =>
          this.request<R>(key, 'DELETE', params, undefined, options),
        patch: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          this.request<R>(key, 'PATCH', params, data, options),
      })
    });
  }

  async request<R>(
    endpointKey: ApiEndpointKey,
    method: string,
    params: CommonParams = {},
    data?: unknown,
    options: CommonOptions = {}
  ): Promise<R> {
    const policy = createPolicies(endpointKey);
    const url = getEndpointUrl(endpointKey, params);

    const mergedOptions = {
      ...baseConfig,
      ...options,
      method,
      headers: {
        ...baseConfig.headers,
        ...options.headers,
      },
      ...(data ? { body: JSON.stringify(data) } : {})
    };

    try {
      const response = await policy(async () => {
        const res = await fetch(url, mergedOptions);
        const responseData = await res.json();
        if (!res.ok) {
          throw new Error(JSON.stringify({
            status: res.status,
            statusText: res.statusText,
            data: responseData,
          }));
        }
        return responseData;
      });

      return response;
    } catch (error) {
      if (error instanceof BrokenCircuitError) {
        throw new Error(`Circuit breaker is open for endpoint: ${endpointKey}`);
      }
      throw error;
    }
  }
} 