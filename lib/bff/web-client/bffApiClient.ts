import { retry, handleAll, ExponentialBackoff, timeout, TimeoutStrategy, ConsecutiveBreaker, circuitBreaker, BrokenCircuitError } from 'cockatiel';
import { EndpointKey, getEndpointUrl, getEndpointTimeout, getCircuitBreakerConfig, getRetryConfig } from './endpoints';

/**
 * BFFからWebAPIアプリケーションへのリクエストのベース設定
 */
const baseConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// サーキットブレーカーのマップ（エンドポイントごとに保持）
const circuitBreakers = new Map<EndpointKey, ReturnType<typeof circuitBreaker>>();

// ポリシー作成関数
const createPolicies = (endpointKey: EndpointKey) => {
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
 * 基本的な実装を提供し、ApiClientによってラップされる
 */
export async function bffApiClient<R>(
  endpointKey: EndpointKey,
  params: Record<string, string> = {},
  options: RequestInit = {}
): Promise<R> {
  const policy = createPolicies(endpointKey);
  const url = getEndpointUrl(endpointKey, params);
  
  const mergedOptions = {
    ...baseConfig,
    ...options,
    headers: {
      ...baseConfig.headers,
      ...options.headers,
    },
  };

  try {
    const response = await policy(async () => {
      const res = await fetch(url, mergedOptions);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify({
          status: res.status,
          statusText: res.statusText,
          data: errorData,
        }));
      }
      return res;
    });

    if (response.status === 204) {
      return {} as R;
    }

    return response.json();
  } catch (error) {
    if (error instanceof BrokenCircuitError) {
      throw new Error(`Circuit breaker is open for endpoint: ${endpointKey}`);
    }
    throw error;
  }
} 