import { http, HttpResponse } from 'msw';
import { mockUser } from './user';

export const handlers = [
  // ユーザー認証関連
  http.post('/api/auth/login', () => {
    return HttpResponse.json({ token: 'mock-token' });
  }),

  http.post('/api/auth/register', () => {
    return new HttpResponse(null, { status: 201 });
  }),

  http.post('/api/auth/password-reset', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.post('/api/auth/password-reset/confirm', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // ユーザー情報関連
  http.get('/api/auth/status', () => {
    return HttpResponse.json({ isAuthenticated: true });
  }),

  http.get('/api/users/profile', () => {
    return HttpResponse.json(mockUser);
  }),

  http.get('/api/users/learning-progress', () => {
    return HttpResponse.json({
      totalQuestions: 100,
      answeredQuestions: 50,
      correctAnswers: 35,
    });
  }),
]; 