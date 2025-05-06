import type { UserProfile } from './user';
import type { AuthResponse } from '@/lib/shared/types/auth';

/**
 * APIエンドポイントのキー型
 */
export type ApiEndpointKey = string;

/**
 * 共通のパラメータ型
 */
export type CommonParams = Record<string, string>;

/**
 * 共通のオプション型
 */
export type CommonOptions = Omit<RequestInit, 'method' | 'body'>;

/**
 * HTTPメソッドごとの型定義
 */
export type HttpMethods<R> = {
  get(params?: CommonParams, options?: Omit<RequestInit, 'method'>): Promise<R>;
  post(data: unknown, params?: CommonParams, options?: CommonOptions): Promise<R>;
  put(data: unknown, params?: CommonParams, options?: CommonOptions): Promise<R>;
  delete(params?: CommonParams, options?: Omit<RequestInit, 'method'>): Promise<R>;
  patch(data: unknown, params?: CommonParams, options?: CommonOptions): Promise<R>;
};

/**
 * APIエンドポイントの定義
 */
export type ApiEndpoints = {
  user: {
    login: HttpMethods<AuthResponse>;
    register: HttpMethods<AuthResponse>;
    getCurrentUserProfile: HttpMethods<UserProfile>;
    updateUserProfile: HttpMethods<UserProfile>;
  };
  exam: {
    getExams: HttpMethods<unknown>;
    getExamById: HttpMethods<unknown>;
    submitExam: HttpMethods<unknown>;
  };
};

/**
 * APIクライアントのインターフェース
 */
export interface IApiClient extends ApiEndpoints {
  request<R>(
    endpointKey: ApiEndpointKey,
    method: string,
    params?: CommonParams,
    data?: unknown,
    options?: CommonOptions
  ): Promise<R>;
} 