/**
 * ブラウザ環境でのMSWワーカー設定ファイル
 * 
 * 主な責務：
 * - ブラウザ環境でのMSWワーカーの設定
 * - 開発環境でのみモックワーカーを起動
 * 
 * 現在の動作：
 * - 開発環境では自動的にブラウザ側のMSWも起動
 * - app/layout.tsxで環境に応じた初期化が行われる
 *   - サーバーサイド: server.tsのサーバーを起動
 *   - クライアントサイド: このファイルのワーカーを起動
 * 
 * 注意：
 * - 開発環境では自動的に起動するが、実際には使用されない
 * - ブラウザからBFFへの通信はモックしない（BFFを経由するため）
 * 
 * ブラウザからの通信をモックしたい場合：
 * handlers.tsにブラウザからの通信に対するハンドラーを追加
 * 例：
 * ```typescript
 * // handlers.tsに追加
 * http.get('/api/users/me', () => {
 *   return HttpResponse.json({ ... });
 * });
 * ```
 * 
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

if (process.env.NODE_ENV === 'development') {
  worker.start();
} 