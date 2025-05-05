/**
 * サーキットブレーカーの設定型
 */
export type CircuitBreakerOptions = {
  threshold: number;        // 失敗回数の閾値
  duration: number;         // オープン状態の持続時間（ミリ秒）
  minimumThroughput?: number; // 最小スループット（オプション）
};

/**
 * エンドポイントの設定型
 */
type EndpointConfig = {
  domain: string;  // APIドメイン
  path: string;    // エンドポイントのパス
  timeout: number; // タイムアウト時間（ミリ秒）
};

/**
 * サーキットブレーカーの設定一覧
 */
export const circuitBreakers = {
  userApi: {
    domain: process.env.USER_API_DOMAIN ?? 'http://localhost:8081',
    config: {
      threshold: 5,      // 5回連続失敗でオープン
      duration: 30000,   // 30秒間オープン状態を維持
      minimumThroughput: 3  // 最低3回の呼び出しを要求
    }
  },
  examApi: {
    domain: process.env.EXAM_API_DOMAIN ?? 'http://localhost:8082',
    config: {
      threshold: 3,      // 3回連続失敗でオープン
      duration: 60000,   // 1分間オープン状態を維持
    }
  },
  adminApi: {
    domain: process.env.ADMIN_API_DOMAIN ?? 'http://localhost:8083',
    config: {
      threshold: 2,      // 2回連続失敗でオープン
      duration: 120000,  // 2分間オープン状態を維持
      minimumThroughput: 2
    }
  }
} as const;

/**
 * エンドポイントの設定一覧
 */
export const endpoints = {
  getUser: {
    domain: circuitBreakers.userApi.domain,
    path: '/users/:id',
    timeout: 5000
  },
  createUser: {
    domain: circuitBreakers.userApi.domain,
    path: '/users',
    timeout: 10000
  },
  getExams: {
    domain: circuitBreakers.examApi.domain,
    path: '/exams',
    timeout: 8000
  },
  getExamById: {
    domain: circuitBreakers.examApi.domain,
    path: '/exams/:id',
    timeout: 5000
  },
  submitExam: {
    domain: circuitBreakers.examApi.domain,
    path: '/exams/:id/submit',
    timeout: 15000
  },
  getAdminStats: {
    domain: circuitBreakers.adminApi.domain,
    path: '/admin/stats',
    timeout: 15000
  }
} as const;

export type EndpointKey = keyof typeof endpoints;
export type CircuitBreakerKey = keyof typeof circuitBreakers;

/**
 * エンドポイントの完全なURLを取得する
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

  return `${endpoint.domain}${resolvedPath}`;
}

/**
 * エンドポイントのタイムアウト時間を取得する
 */
export function getEndpointTimeout(endpointKey: EndpointKey): number {
  return endpoints[endpointKey].timeout;
}

/**
 * ドメインに対応するサーキットブレーカーの設定を取得する
 */
export function getCircuitBreakerConfig(endpointKey: EndpointKey): CircuitBreakerOptions {
  const domain = endpoints[endpointKey].domain;
  const breakerKey = Object.entries(circuitBreakers).find(
    ([_, config]) => config.domain === domain
  )?.[0] as CircuitBreakerKey;

  if (!breakerKey) {
    throw new Error(`No circuit breaker configuration found for domain: ${domain}`);
  }

  return circuitBreakers[breakerKey].config;
} 