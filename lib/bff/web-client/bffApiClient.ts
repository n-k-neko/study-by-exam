import { retry, handleAll, ExponentialBackoff, timeout, TimeoutStrategy, ConsecutiveBreaker, circuitBreaker, BrokenCircuitError } from 'cockatiel';
import { endpoints, EndpointKey } from './endpoints';

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
  timeout: 10000,  // デフォルトタイムアウト: 10秒
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

// エンドポイントキーを取得する関数
const getEndpointKey = (endpoint: string): EndpointKey | undefined => {
  return Object.entries(endpoints).find(
    ([_, config]) => endpoint.startsWith(config.base)
  )?.[0] as EndpointKey | undefined;
};

// サーキットブレーカーの設定型
export type CircuitBreakerOptions = {
  threshold: number;        // 失敗回数の閾値
  duration: number;         // オープン状態の持続時間（ミリ秒）
  minimumThroughput?: number; // 最小スループット（オプション）
};

// ポリシー作成関数
const createPolicies = (endpoint: string, timeoutMs: number = DEFAULT_CONFIG.timeout) => {
  // タイムアウトポリシーの作成
  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Aggressive);
  
  // リトライポリシーの作成
  const retryPolicy = retry(handleAll, {
    maxAttempts: DEFAULT_CONFIG.retry.maxAttempts,
    backoff: new ExponentialBackoff({
      initialDelay: DEFAULT_CONFIG.retry.backoff.initialDelay,
      maxDelay: DEFAULT_CONFIG.retry.backoff.maxDelay,
    }),
  });

  // エンドポイントに対応するサーキットブレーカー設定を取得
  const endpointKey = getEndpointKey(endpoint);
  if (!endpointKey) {
    return async <T>(fn: () => Promise<T>): Promise<T> => {
      return timeoutPolicy.execute(() => retryPolicy.execute(fn));
    };
  }

  // サーキットブレーカーの取得または作成
  let breakerPolicy = circuitBreakers.get(endpointKey);
  if (!breakerPolicy) {
    const config = endpoints[endpointKey].circuitBreaker;
    breakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: config.duration,
      breaker: new ConsecutiveBreaker(config.threshold)
    });
    circuitBreakers.set(endpointKey, breakerPolicy);
  }

  // ポリシーの組み合わせ
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return timeoutPolicy.execute(() => 
      breakerPolicy.execute(() => 
        retryPolicy.execute(fn)
      )
    );
  };
};

/**
 * WebAPIアプリケーションへのリクエストを行うクライアント
 * @param endpoint - エンドポイントのパス（例: '/api/users'）
 * @param options - フェッチオプション
 * @returns レスポンスデータ
 */
export async function bffApiClient<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options;
  const policy = createPolicies(endpoint, timeoutMs);
  
  const url = `${API_BASE_URL}${endpoint}`;
  const mergedOptions = {
    ...baseConfig,
    ...fetchOptions,
    headers: {
      ...baseConfig.headers,
      ...fetchOptions.headers,
    },
  };

  try {
    // タイムアウトとリトライを含むフェッチの実行
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

    // レスポンスがない場合（204 No Content）は空オブジェクトを返す
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof BrokenCircuitError) {
      const endpointKey = getEndpointKey(endpoint);
      throw new Error(`Circuit breaker is open for endpoint type: ${endpointKey}`);
    }
    throw error;
  }
}

/**
 * GETリクエスト
 */
export function get<T>(endpoint: string, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'GET',
  });
}

/**
 * POSTリクエスト
 */
export function post<T>(endpoint: string, data: unknown, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUTリクエスト
 */
export function put<T>(endpoint: string, data: unknown, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETEリクエスト
 */
export function del<T>(endpoint: string, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * PATCHリクエスト
 */
export function patch<T>(endpoint: string, data: unknown, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
} 