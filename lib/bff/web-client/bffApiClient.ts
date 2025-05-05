import { retry, handleAll, ExponentialBackoff, timeout, TimeoutStrategy, ConsecutiveBreaker, circuitBreaker, BrokenCircuitError } from 'cockatiel';
import { EndpointKey, getEndpointUrl, getEndpointTimeout, getCircuitBreakerConfig } from './endpoints';

/**
 * BFFからWebAPIアプリケーションへのリクエストのベース設定
 */
const baseConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * APIのベースURL
 * 環境変数が設定されていない場合は開発環境のURLをデフォルトとして使用
 */
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

// デフォルトの設定
const DEFAULT_CONFIG = {
  retry: {
    maxAttempts: 3,
    backoff: {
      initialDelay: 1000,  // 初回リトライまでの待機時間（ミリ秒）
      maxDelay: 5000      // 最大待機時間（ミリ秒）
    }
  }
} as const;

// サーキットブレーカーのマップ（エンドポイントごとに保持）
const circuitBreakers = new Map<EndpointKey, ReturnType<typeof circuitBreaker>>();

// ポリシー作成関数
const createPolicies = (endpointKey: EndpointKey) => {
  const timeoutMs = getEndpointTimeout(endpointKey);
  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Aggressive);
  
  const retryPolicy = retry(handleAll, {
    maxAttempts: DEFAULT_CONFIG.retry.maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay: DEFAULT_CONFIG.retry.backoff.initialDelay,
      maxDelay: DEFAULT_CONFIG.retry.backoff.maxDelay,
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

/**
 * APIクライアントを生成する型
 */
type ApiClient = {
  [E in EndpointKey]: {
    get(params?: Record<string, string>, options?: Omit<RequestInit, 'method'>): Promise<unknown>;
    post(data: unknown, params?: Record<string, string>, options?: Omit<RequestInit, 'method' | 'body'>): Promise<unknown>;
    put(data: unknown, params?: Record<string, string>, options?: Omit<RequestInit, 'method' | 'body'>): Promise<unknown>;
    delete(params?: Record<string, string>, options?: Omit<RequestInit, 'method'>): Promise<unknown>;
    patch(data: unknown, params?: Record<string, string>, options?: Omit<RequestInit, 'method' | 'body'>): Promise<unknown>;
  };
};

/**
 * APIクライアントを生成する
 */
function createApiClient(): ApiClient {
  return new Proxy({} as ApiClient, {
    get(target, endpointKey: EndpointKey) {
      return {
        get: <R>(params?: Record<string, string>, options?: Omit<RequestInit, 'method'>) =>
          bffApiClient<R>(endpointKey, params, { ...options, method: 'GET' }),

        post: <R>(data: unknown, params?: Record<string, string>, options?: Omit<RequestInit, 'method' | 'body'>) =>
          bffApiClient<R>(endpointKey, params, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
          }),

        put: <R>(data: unknown, params?: Record<string, string>, options?: Omit<RequestInit, 'method' | 'body'>) =>
          bffApiClient<R>(endpointKey, params, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
          }),

        delete: <R>(params?: Record<string, string>, options?: Omit<RequestInit, 'method'>) =>
          bffApiClient<R>(endpointKey, params, { ...options, method: 'DELETE' }),

        patch: <R>(data: unknown, params?: Record<string, string>, options?: Omit<RequestInit, 'method' | 'body'>) =>
          bffApiClient<R>(endpointKey, params, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
          }),
      };
    },
  });
}

/**
 * APIクライアントのインスタンス
 */
export const api = createApiClient(); 