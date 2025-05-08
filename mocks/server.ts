/**
 * MSWサーバーのインスタンスをエクスポートするファイル
 * 
 * 主な責務：
 * - MSWサーバーのインスタンスをエクスポート
 * - ハンドラーの設定をサーバーに適用
 * 
 * 使用箇所：
 * - テストファイルでのモックサーバーの利用
 * - サーバーサイドでのAPIモックの設定
 * - app/layout.tsxでのサーバーサイド初期化
 * 
 * 注意：
 * - このファイルはサーバーインスタンスの定義のみを担当
 * - サーバーの起動は app/layout.tsx で行う
 * - 開発環境でのみサーバーを起動
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers); 