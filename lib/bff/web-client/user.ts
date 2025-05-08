import { api } from './';
import type { LoginCredentials, RegisterCredentials, AuthResponse } from '@/lib/shared/types/auth';
import { ApiResponse } from '@/lib/shared/types/api';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export class UserClient {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return api.user.login.post(credentials);
  }

  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return api.user.register.post(credentials);
  }

  static async getCurrentUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await api.user.getCurrentUserProfile.get();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: 'ユーザー情報の取得に失敗しました' };
    }
  }

  static async updateUserProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await api.user.updateUserProfile.put(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: 'プロフィールの更新に失敗しました' };
    }
  }
} 