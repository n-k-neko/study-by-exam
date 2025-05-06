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
 * APIクライアントのインターフェース
 */
export interface IApiClient {
  request<R>(
    endpointKey: ApiEndpointKey,
    method: string,
    params?: CommonParams,
    data?: unknown,
    options?: CommonOptions
  ): Promise<R>;
} 