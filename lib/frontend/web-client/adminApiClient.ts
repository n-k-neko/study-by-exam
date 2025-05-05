import axios from 'axios';
import { ExamQuestionProposal } from '@/lib/shared/types/exam';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 管理者用API（動的データ取得のみ）
export const adminApiClient = {
  // 提案一覧の取得（動的、フィルタリング・ソート対応）
  getProposals: (params: { status?: string; sortBy?: string; order?: 'asc' | 'desc' }) => 
    apiClient.get('/admin/proposals', { params }),
  
  // 問題一覧の取得（動的、フィルタリング・ソート対応）
  getQuestions: (params: { categoryId?: string; sortBy?: string; order?: 'asc' | 'desc' }) => 
    apiClient.get('/admin/questions', { params }),
}; 