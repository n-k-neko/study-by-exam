/**
 * APIドメインの設定
 */
export const domains = {
  userApi: process.env.USER_API_DOMAIN ?? 'http://localhost:8081',
  examApi: process.env.EXAM_API_DOMAIN ?? 'http://localhost:8082',
  adminApi: process.env.ADMIN_API_DOMAIN ?? 'http://localhost:8083',
} as const;

/**
 * サーキットブレーカーの設定型
 */
export type CircuitBreakerOptions = {
  threshold: number;        // 失敗回数の閾値
  duration: number;         // オープン状態の持続時間（ミリ秒）
  minimumThroughput?: number; // 最小スループット（オプション）
};

/**
 * リトライの設定型
 */
export type RetryOptions = {
  maxAttempts: number;
  backoff: {
    initialDelay: number;  // ミリ秒
    maxDelay: number;      // ミリ秒
  };
};

/**
 * エンドポイントの設定型（内部用）
 */
type EndpointInternalConfig = {
  domain: keyof typeof domains;
  path: string;
  timeout: number;
  circuitBreaker: CircuitBreakerOptions;
  retry: RetryOptions;
};

/**
 * エンドポイントの設定一覧
 * ドメインレイヤーからは参照されない、インフラレイヤーの内部設定
 */
const endpointConfigs = {
  user: {
    domain: 'userApi' as const,
    defaultTimeout: 5000,
    circuitBreaker: {
      threshold: 5,
      duration: 30000,
      minimumThroughput: 3
    },
    retry: {
      maxAttempts: 3,
      backoff: {
        initialDelay: 1000,
        maxDelay: 5000
      }
    },
    endpoints: {
      getUser: {
        path: '/users/:id',
      },
      createUser: {
        path: '/users',
        timeout: 10000,
        retry: {  // 作成処理は慎重にリトライ
          maxAttempts: 2,
          backoff: {
            initialDelay: 2000,
            maxDelay: 8000
          }
        }
      },
    },
  },
  exam: {
    domain: 'examApi' as const,
    defaultTimeout: 8000,
    circuitBreaker: {
      threshold: 3,
      duration: 60000,
    },
    retry: {
      maxAttempts: 2,  // 試験関連は少なめのリトライ
      backoff: {
        initialDelay: 1500,
        maxDelay: 4000
      }
    },
    endpoints: {
      getExams: {
        path: '/exams',
      },
      getExamById: {
        path: '/exams/:id',
        timeout: 5000,
      },
      submitExam: {
        path: '/exams/:id/submit',
        timeout: 15000,
        retry: {  // 提出は特に慎重に
          maxAttempts: 5,
          backoff: {
            initialDelay: 1000,
            maxDelay: 10000
          }
        }
      },
    },
  },
  admin: {
    domain: 'adminApi' as const,
    defaultTimeout: 15000,
    circuitBreaker: {
      threshold: 2,
      duration: 120000,
      minimumThroughput: 2
    },
    retry: {
      maxAttempts: 3,
      backoff: {
        initialDelay: 2000,
        maxDelay: 8000
      }
    },
    endpoints: {
      getAdminStats: {
        path: '/admin/stats',
      },
    },
  },
} as const;

/**
 * エンドポイントの設定を平坦化して管理
 */
export const endpoints = Object.entries(endpointConfigs).reduce((acc, [_, domainConfig]) => {
  const endpoints = Object.entries(domainConfig.endpoints).reduce((endpointAcc, [key, endpoint]) => {
    return {
      ...endpointAcc,
      [key]: {
        domain: domainConfig.domain,
        path: endpoint.path,
        timeout: endpoint.timeout ?? domainConfig.defaultTimeout,
        circuitBreaker: domainConfig.circuitBreaker,
        retry: (endpoint as any).retry ?? domainConfig.retry,
      },
    };
  }, {});
  return { ...acc, ...endpoints };
}, {}) as Record<string, EndpointInternalConfig>;

export type EndpointKey = keyof typeof endpoints;

/**
 * エンドポイントの完全なURLを取得する
 * ドメインレイヤーから呼び出される関数
 */
export function getEndpointUrl(
  endpointKey: EndpointKey,
  params: Record<string, string> = {}
): string {
  const endpoint = endpoints[endpointKey];
  let resolvedPath: string = endpoint.path;

  // パスパラメータの置換
  Object.entries(params).forEach(([key, value]) => {
    resolvedPath = resolvedPath.replace(`:${key}`, value);
  });

  return `${domains[endpoint.domain]}${resolvedPath}`;
}

/**
 * エンドポイントのタイムアウト時間を取得する
 * インフラレイヤーの内部関数
 */
export function getEndpointTimeout(endpointKey: EndpointKey): number {
  return endpoints[endpointKey].timeout;
}

/**
 * サーキットブレーカーの設定を取得する
 * インフラレイヤーの内部関数
 */
export function getCircuitBreakerConfig(endpointKey: EndpointKey): CircuitBreakerOptions {
  return endpoints[endpointKey].circuitBreaker;
}

/**
 * リトライの設定を取得する
 * インフラレイヤーの内部関数
 */
export function getRetryConfig(endpointKey: EndpointKey): RetryOptions {
  return endpoints[endpointKey].retry;
} 