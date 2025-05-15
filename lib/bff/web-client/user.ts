import { ApiResponse } from '@/lib/bff/web-client/types/response';
import { fetchApi } from './api/client';
import type { User, UserProfile } from '@/lib/shared/types/user';
import type { AuthResponse, LoginCredentials } from '@/lib/shared/types/auth';
import type { RegisterCredentials } from '@/lib/shared/types/registration';
import type { CacheOptions } from '@/lib/bff/web-client/types/cache';

/**
 * ユーザー関連のAPIリクエスト
 */
export const userApi = {
  /**
   * ユーザー情報を取得
   */
  async getUser(userId: string, options?: CacheOptions): Promise<ApiResponse<User>> {
    const url = `/api/users/${userId}`;
    return fetchApi<User>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  /**
   * ユーザー情報を更新
   */
  async updateUser(userId: string, data: Partial<User>, options?: CacheOptions): Promise<ApiResponse<User>> {
    const url = `/api/users/${userId}`;
    return fetchApi<User>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * ログイン
   */
  async login(credentials: LoginCredentials, options?: CacheOptions): Promise<AuthResponse> {
    const url = 'https://localhost:8080/auth/login';
    
    // 基本的なリクエストオプション
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      timeout: 10000,
    };
    
    // optionsが指定されている場合のみ、キャッシュ設定を追加
    const finalOptions = options 
      ? { ...requestOptions, ...options }
      : requestOptions;
    
    const response: ApiResponse<AuthResponse> = await fetchApi<AuthResponse>(url, finalOptions);

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
  async register(credentials: RegisterCredentials, options?: CacheOptions): Promise<ApiResponse<AuthResponse>> {
    const url = '/api/auth/register';
    return fetchApi<AuthResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
  },

  /**
   * 現在のユーザープロフィールを取得
   */
  async getCurrentUserProfile(options?: CacheOptions): Promise<ApiResponse<UserProfile>> {
    const url = '/api/users/me';
    return fetchApi<UserProfile>(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  /**
   * ユーザープロフィールを更新
   */
  async updateUserProfile(data: Partial<UserProfile>, options?: CacheOptions): Promise<ApiResponse<UserProfile>> {
    const url = '/api/users/me';
    return fetchApi<UserProfile>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },
}; 