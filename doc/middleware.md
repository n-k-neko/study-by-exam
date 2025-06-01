# Next.jsのMiddleware

## Middleware とは

### 役割
- リクエストの前処理
  - 簡易的な認証・認可
    - Cookieの存在確認（注意：偽装可能なため、後続の処理で完全な検証が必要）
    - セッションIDの存在確認（注意：偽装可能なため、後続の処理で完全な検証が必要）
    > JWT,外部APIの場合は技術的には検証可能だが、Middlewareは簡易検証のみに留める
  - ヘッダーの追加・変更
- レスポンスの後処理
  - ヘッダーの追加・変更
  - レスポンスの書き換え
- ルーティング制御
  - パスベースの制御
  - 条件分岐による処理
  - リダイレクト
    - 認証失敗時のログインページへのリダイレクト
    - 権限不足時のエラーページへのリダイレクト
    - 地域制限時のリダイレクト

### エッジランタイムでの動作
- Edge Runtime
  - V8 Isolateベースの軽量な実行環境
  - Vercelのエッジネットワークで実行（注意：Vercel固有の機能）
  - 低レイテンシでのレスポンス
  - スケーラブルな処理（注意：Vercelのエッジネットワークによる自動スケーリング）
- メリット
  - 高速なレスポンス
  - Vercelのグローバルエッジネットワークによる可用性
  - サーバーレスな運用（Vercel環境）
  - コスト効率の良い処理

### 実行内容の制約
- 使用できない機能
  - Node.js API
    - 例：
      - `fs`モジュール（ファイルシステム操作）
      - `crypto`モジュール（暗号化処理）
      - `child_process`（プロセス生成）
      - `worker_threads`（スレッド操作）
  - データベース接続
- 制限される機能
  - 外部API呼び出し
    - 注意：`fetch`は使用可能だが、以下の制限あり
      - タイムアウト：30秒
      - メモリ：50MB
      - 一部のヘッダー制限
  - 認証・認可処理
    - トークンの検証
      - 注意：JWTの検証は技術的には可能
      - 注意：ただし、完全な検証にはデータベースアクセスが必要な場合がある
    - ユーザー情報の取得
      - 注意：JWTの場合はトークン内の情報のみ取得可能
      - 注意：データベースの場合は不可
      - 注意：外部WebAPIの場合は`fetch`で可能だが、パフォーマンスに注意
    - NextAuthのauthメソッド
      - セッションベースの場合：データベースアクセスが必要なため不可
      - JWT方式の場合：トークンの検証のみ可能だが非推奨
  - メモリ使用量（最大50MB）
  - 実行時間（最大30秒）
  - リクエストサイズ
  - レスポンスサイズ

### 注意点
- パフォーマンスへの影響
  - すべてのリクエストで実行される
  - 処理が重いとレイテンシが増加
- デバッグの難しさ
  - エッジ環境での実行
  - ログの取得が困難
- エラーハンドリング
  - 適切なエラーレスポンス
  - フォールバック処理
- セキュリティ
  - 機密情報の取り扱い
  - 認証・認可の実装方針
    - Middleware: Cookieの存在確認のみ
    - AppRouter: 完全な認証・認可処理

## Middlewareの特徴をふまえた認証・認可の実装方針
- Middlewareでの制限
  - CookieやセッションIDの存在確認のみ
  - NextAuthのauthメソッドは使用しない
    - 理由：
      - セッションベース：データベースアクセスが必要だが、Middlewareの制約により不可
      - JWT方式：技術的には可能だが、パフォーマンスとセキュリティの観点から非推奨
      - 外部API方式：パフォーマンスとセキュリティの観点から非推奨
- AppRouterでの実装
  - 完全な認証・認可処理
  - データベースアクセスや外部API呼び出し
  - NextAuthのauthメソッドの使用
    - JWT方式の場合でも、完全な検証はAppRouterで行う
    - セッションベースの場合は必ずAppRouterで実装

### 認証方式による違い
- JWT方式
  - データベースアクセス不要
  - トークンの検証のみ
  - 注意：Middlewareでの完全な検証は可能だが推奨しない
    - 理由：
      - エッジランタイムでの実行時間制限
      - トークンの検証処理の複雑さ
      - エラーハンドリングの難しさ
      - セキュリティリスクの増加
- セッションベース
  - データベースアクセスが必要
  - セッションの完全な検証が必要
  - パフォーマンスへの影響が大きい

### 実装例
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Cookieの存在確認のみ
  const session = request.cookies.get('session')
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // レスポンスの書き換え
  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'custom-value')

  return response
}

// 特定のパスでのみ実行
export const config = {
  matcher: '/api/:path*'
}
```
