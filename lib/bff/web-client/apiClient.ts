import { ApiEndpointKey, CommonParams, CommonOptions, HttpMethods, IApiClient } from './types';

/**
 * APIクライアントを生成する型
 */
export type ApiClient = {
  [E in ApiEndpointKey]: HttpMethods<unknown>;
};

/**
 * APIクライアントを生成する
 */
export function createApiClient(implementation: IApiClient): ApiClient {
  return new Proxy({} as ApiClient, {
    get(target, endpointKey: ApiEndpointKey) {
      return {
        get: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
          implementation.request<R>(endpointKey, 'GET', params, undefined, options),

        post: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          implementation.request<R>(endpointKey, 'POST', params, data, options),

        put: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          implementation.request<R>(endpointKey, 'PUT', params, data, options),

        delete: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
          implementation.request<R>(endpointKey, 'DELETE', params, undefined, options),

        patch: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          implementation.request<R>(endpointKey, 'PATCH', params, data, options),
      };
    },
  });
} 