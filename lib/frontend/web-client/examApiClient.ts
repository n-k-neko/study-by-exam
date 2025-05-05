import axios from 'axios';
import { ExamQuestion } from '@/lib/shared/types/exam';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 試験問題関連のAPI（動的データ取得のみ）
export const examApiClient = {
  // ユーザーの解答履歴の取得（動的）
  getUserAnswerHistory: (questionId: string) => 
    apiClient.get(`/exam/questions/${questionId}/history`),
  
  // 推奨問題の取得（動的）
  getRecommendedQuestions: () => 
    apiClient.get('/exam/questions/recommended'),
  
  // 検索結果の取得（動的）
  searchQuestions: (query: string) => 
    apiClient.get(`/exam/questions/search?q=${encodeURIComponent(query)}`),
}; 