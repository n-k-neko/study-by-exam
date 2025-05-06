import { ApiEndpointKey } from './types';

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
  threshold: number;
  duration: number;
  minimumThroughput?: number;
};

/**
 * リトライの設定型
 */
export type RetryOptions = {
  maxAttempts: number;
  backoff: {
    initialDelay: number;
    maxDelay: number;
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
        retry: {
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
      maxAttempts: 2,
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
        retry: {
          maxAttempts: 5,
          backoff: {
            initialDelay: 1000,
            maxDelay: 10000
          }
        }
      },
    },
  },
} as const;

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

export function getEndpointUrl(
  endpointKey: ApiEndpointKey,
  params: Record<string, string> = {}
): string {
  const endpoint = endpoints[endpointKey];
  let resolvedPath = endpoint.path;

  Object.entries(params).forEach(([key, value]) => {
    resolvedPath = resolvedPath.replace(`:${key}`, value);
  });

  return `${domains[endpoint.domain]}${resolvedPath}`;
}

export function getEndpointTimeout(endpointKey: ApiEndpointKey): number {
  return endpoints[endpointKey].timeout;
}

export function getCircuitBreakerConfig(endpointKey: ApiEndpointKey): CircuitBreakerOptions {
  return endpoints[endpointKey].circuitBreaker;
}

export function getRetryConfig(endpointKey: ApiEndpointKey): RetryOptions {
  return endpoints[endpointKey].retry;
} 