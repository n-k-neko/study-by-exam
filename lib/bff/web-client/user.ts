import { RequestOptions } from '@/lib/shared/types/api/request';
import { ApiResponse } from '@/lib/shared/types/api/response';
import { fetchApi } from './api/client';
import type { User, UserProfile } from '@/lib/shared/types/user';
import type { AuthResponse, LoginCredentials } from '@/lib/shared/types/auth';
import type { RegisterCredentials } from '@/lib/shared/types/registration';

/**
 * ユーザー関連のAPIリクエスト
 */
export const userApi = {
  /**
   * ユーザー情報を取得
   */
  async getUser(userId: string, options?: RequestOptions): Promise<ApiResponse<User>> {
    const url = `/api/users/${userId}`;
    return fetchApi<User>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      timeout: options?.timeout,
    });
  },

  /**
   * ユーザー情報を更新
   */
  async updateUser(userId: string, data: Partial<User>, options?: RequestOptions): Promise<ApiResponse<User>> {
    const url = `/api/users/${userId}`;
    return fetchApi<User>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      timeout: options?.timeout,
    });
  },

  /**
   * ログイン
   */
  async login(credentials: LoginCredentials, options?: RequestOptions): Promise<AuthResponse> {
    const url = 'https://localhost:8080/auth/login';
    const response : ApiResponse<AuthResponse> = await fetchApi<AuthResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(credentials),
      timeout: 10000,
    });

    // TODO: エラーハンドリング
    // ここにたどり着くということはリトライやCircuitBreakerの設定がうまくいっていないということ？
    // if (response.status !== 200) {
    //   throw new Error('ログインに失敗しました');
    // }

    return response.data;
  },

  /**
   * ユーザー登録
   */
  async register(credentials: RegisterCredentials, options?: RequestOptions): Promise<ApiResponse<AuthResponse>> {
    const url = '/api/auth/register';
    return fetchApi<AuthResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(credentials),
      timeout: options?.timeout,
    });
  },

  /**
   * 現在のユーザープロフィールを取得
   */
  async getCurrentUserProfile(options?: RequestOptions): Promise<ApiResponse<UserProfile>> {
    const url = '/api/users/me';
    return fetchApi<UserProfile>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      timeout: options?.timeout,
    });
  },

  /**
   * ユーザープロフィールを更新
   */
  async updateUserProfile(data: Partial<UserProfile>, options?: RequestOptions): Promise<ApiResponse<UserProfile>> {
    const url = '/api/users/me';
    return fetchApi<UserProfile>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      timeout: options?.timeout,
    });
  },
}; 