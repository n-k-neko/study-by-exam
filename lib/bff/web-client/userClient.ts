import { retry } from '@/lib/bff/web-client/bffApiUtils';

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

/**
 * WebAPIアプリケーションへのリクエストを行うクライアント
 * @param endpoint - エンドポイントのパス（例: '/api/users'）
 * @param options - フェッチオプション
 * @returns レスポンスデータ
 */
export async function bffApiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const mergedOptions = {
    ...baseConfig,
    ...options,
    headers: {
      ...baseConfig.headers,
      ...options.headers,
    },
  };

  // リトライ処理を含むフェッチの実行
  const response = await retry(async () => {
    const res = await fetch(url, mergedOptions);
    
    if (!res.ok) {
      // エラーレスポンスの詳細を取得
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