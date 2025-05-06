import { EndpointKey } from './endpoints';
import { bffApiClient } from './bffApiClient';

/**
 * 共通のパラメータ型
 */
type CommonParams = Record<string, string>;

/**
 * 共通のオプション型
 */
type CommonOptions = Omit<RequestInit, 'method' | 'body'>;

/**
 * HTTPメソッドごとの型定義
 */
type HttpMethods<R> = {
  get(params?: CommonParams, options?: Omit<RequestInit, 'method'>): Promise<R>;
  post(data: unknown, params?: CommonParams, options?: CommonOptions): Promise<R>;
  put(data: unknown, params?: CommonParams, options?: CommonOptions): Promise<R>;
  delete(params?: CommonParams, options?: Omit<RequestInit, 'method'>): Promise<R>;
  patch(data: unknown, params?: CommonParams, options?: CommonOptions): Promise<R>;
};

/**
 * APIクライアントを生成する型
 * bffApiClientの呼び出しを型安全かつ使いやすくするためのラッパー
 * - エンドポイント名の自動補完
 * - HTTPメソッドの型安全な制限
 * - リクエストオプションの自動設定
 */
export type ApiClient = {
  [E in EndpointKey]: HttpMethods<unknown>;
};

/**
 * APIクライアントを生成する
 * Proxyを使用してbffApiClientの呼び出しをラップし、より使いやすいインターフェースを提供する
 * 
 * 使用例：
 * const user = await api.getUser.get<User>({ id: '123' });
 * const newUser = await api.createUser.post<User>(userData);
 * 
 * Note: 直接bffApiClientを使用することも可能です
 */
function createApiClient(): ApiClient {
  return new Proxy({} as ApiClient, {
    get(target, endpointKey: EndpointKey) {
      return {
        get: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
          bffApiClient<R>(endpointKey, params, { ...options, method: 'GET' }),

        post: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          bffApiClient<R>(endpointKey, params, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
          }),

        put: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          bffApiClient<R>(endpointKey, params, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
          }),

        delete: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
          bffApiClient<R>(endpointKey, params, { ...options, method: 'DELETE' }),

        patch: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
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
 * シングルトンとしてエクスポート
 */
export const api = createApiClient(); 