import axios from 'axios';
import { UserProfile } from '@/lib/shared/types/user';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ユーザー関連のAPI（動的データ取得のみ）
export const userApiClient = {
  // ログイン状態の確認（動的）
  checkAuthStatus: () => apiClient.get('/auth/status'),
  
  // プロフィール情報の取得（動的）
  getProfile: () => apiClient.get('/users/profile'),
  
  // 学習進捗の取得（動的）
  getLearningProgress: () => apiClient.get('/users/learning-progress'),
}; 