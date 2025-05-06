import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// 開発環境でのみモックサーバーを起動
if (process.env.NODE_ENV === 'development') {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('🔶 Mock Service Worker started');
} 