import { ApiEndpointKey, CommonParams, CommonOptions, HttpMethods, IApiClient, ApiEndpoints } from './types';

/**
 * APIクライアントを生成する型
 */
export type ApiClient = ApiEndpoints;

/**
 * BFF層のAPIクライアントを生成する
 */
export function createBffApiClient(implementation: IApiClient): ApiClient {
  return new Proxy({} as ApiClient, {
    get(target, domain: string) {
      return new Proxy({} as Record<string, HttpMethods<unknown>>, {
        get(_, endpoint: string) {
          return {
            get: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
              implementation.request<R>(endpoint, 'GET', params, undefined, options),

            post: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
              implementation.request<R>(endpoint, 'POST', params, data, options),

            put: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
              implementation.request<R>(endpoint, 'PUT', params, data, options),

            delete: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
              implementation.request<R>(endpoint, 'DELETE', params, undefined, options),

            patch: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
              implementation.request<R>(endpoint, 'PATCH', params, data, options),
          };
        }
      });
    },
  });
} 