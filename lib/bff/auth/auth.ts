/**
 * NextAuth.jsの認証機能をアプリケーション全体に提供するファイル
 * 
 * 主な責務：
 * - 認証機能のエクスポート（handlers, auth, signIn, signOut）
 * - API Routeハンドラの提供（GET, POST）
 * 
 * このファイルは認証機能の提供に特化し、設定は config.ts から読み込む
 * アプリケーション全体で使用される認証関連の機能をここで一元管理する
 */

import NextAuth from 'next-auth';
import { authConfig } from './config';
// 型定義の拡張（Module Augmentation）を有効にするためのインポート
// このインポートは使用されていないように見えますが、
// types.tsで定義された next-auth と next-auth/jwt の型拡張を
// アプリケーション全体で利用可能にするために必要です
import './types';

// NextAuth関数から認証に必要な機能を取得し、アプリケーション全体で使用できるようにエクスポート
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// API Routeハンドラをエクスポート
export const GET = handlers.GET;
export const POST = handlers.POST; 