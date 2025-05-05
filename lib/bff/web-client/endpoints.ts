import type { CircuitBreakerOptions } from './bffApiClient';

type EndpointConfig = {
  base: string;
  circuitBreaker: CircuitBreakerOptions;
};

export const endpoints = {
  users: {
    base: '/api/users',
    circuitBreaker: {
      threshold: 5,      // 5回連続失敗でオープン
      duration: 30000,   // 30秒間オープン状態を維持
      minimumThroughput: 3  // 最低3回の呼び出しを要求
    }
  },
  exams: {
    base: '/api/exams',
    circuitBreaker: {
      threshold: 3,      // 3回連続失敗でオープン
      duration: 60000,   // 1分間オープン状態を維持
    }
  },
  admin: {
    base: '/api/admin',
    circuitBreaker: {
      threshold: 2,      // 2回連続失敗でオープン（より厳格）
      duration: 120000,  // 2分間オープン状態を維持
      minimumThroughput: 2
    }
  }
} as const satisfies Record<string, EndpointConfig>;

export type EndpointKey = keyof typeof endpoints; 