# BFFアーキテクチャの改善提案

## 現状の問題点

### 1. 依存関係の逆転
- 現状：プレゼンテーション層（page.tsx）やアプリケーション層（server-actions）が永続化層（web-client）に直接依存
- 問題：
  - クリーンアーキテクチャの原則に反する
  - 実装の詳細が上位層に漏れる
  - テストが困難
  - 実装の変更が上位層に影響を与える

## 改善案

### 1. フォルダ構成の見直し
```
lib/
  └── bff/
      ├── application/      # アプリケーション層
      │   ├── repository/   # リポジトリインターフェース
      │   │   ├── user.ts
      │   │   └── auth.ts
      │   └── server-actions/
      │       ├── userActions.ts
      │       └── authActions.ts
      │
      ├── infrastructure/   # 永続化層
      │   └── web-client/
      │       ├── user.ts
      │       └── auth.ts
      │
      ├── container/        # DIコンテナ
      │   ├── index.ts      # 公開API
      │   └── implementations.ts  # 実装の詳細
      │
      └── auth/            # NextAuthの設定
          ├── auth.ts
          └── config.ts
```

### 2. 依存性注入（DI）の実装
```typescript
// lib/bff/application/repository/user.ts
export interface UserRepository {
  login(params: { email: string; password: string }): Promise<{ success: boolean }>;
  logout(): Promise<void>;
}

// lib/bff/container/index.ts
import type { UserRepository } from '../application/repository/user';

// 実装の詳細は別ファイルに分離
import { implementations } from './implementations';

// リポジトリを取得する関数
export function getRepository(interfaceType: Function): unknown {
  const implementation = implementations.get(interfaceType);
  if (!implementation) {
    throw new Error(`Repository implementation not found for ${interfaceType.name}`);
  }
  return implementation;
}

// lib/bff/container/implementations.ts
import type { UserRepository } from '../application/repository/user';
import { WebClientUserRepository } from '../infrastructure/web-client/user';
import { MockUserRepository } from '../infrastructure/web-client/mock/user';

// インターフェースと実装のマッピング（起動時に1回だけ初期化）
export const implementations = new Map<Function, unknown>([
  [
    UserRepository,
    process.env.NODE_ENV === 'test'
      ? new MockUserRepository()
      : new WebClientUserRepository()
  ],
]);
```

この設計のポイント：
1. 実装の詳細を別ファイルに分離
   - アプリケーション層から実装の詳細を隠蔽
   - 依存関係の方向を正しく保つ
2. アプリケーション層はインターフェースのみを参照
   - 実装の詳細を知る必要がない
   - クリーンアーキテクチャの原則に従う
3. 環境に応じた実装の切り替えはcontainerの責務
   - 実装の詳細を知るのはcontainerの責務
   - アプリケーション層には影響を与えない

### 3. DIコンテナの使用例
```typescript
// lib/bff/application/server-actions/userActions.ts
import { getRepository } from '../../container';
import type { UserRepository } from '../repository/user';

export async function login(formData: FormData) {
  'use server';
  
  // リポジトリの取得
  const userRepository = getRepository(UserRepository) as UserRepository;
  
  // リポジトリの使用
  const result = await userRepository.login({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });
  
  return result;
}
```

## 改善によるメリット

### 1. 依存関係の正しい方向
- アプリケーション層がリポジトリインターフェースを定義
  - インターフェースは`application/repository`に配置
  - アプリケーション層が必要とする操作を定義
  - 実装の詳細は含まない
- 永続化層がインターフェースを実装
  - インターフェースの実装は`infrastructure/web-client`に配置
  - 実装の詳細（HTTP通信など）は永続化層に閉じ込める
  - アプリケーション層の変更に影響されない
- 上位層が下位層に依存しない
  - プレゼンテーション層（page.tsx）は直接永続化層に依存しない
    - 初期表示時はアプリケーション層のリポジトリを経由してデータを取得
    - ユーザーアクション時（フォーム送信など）にserver-actionsを呼び出す
  - アプリケーション層はインターフェースにのみ依存
  - 永続化層の実装を変更しても、上位層に影響を与えない
  - 例：WebClientUserRepositoryを別の実装に置き換えても、アプリケーション層のコードは変更不要

### 2. テスト容易性の向上
- モックリポジトリの注入が容易
  - 環境変数`NODE_ENV`で実装を切り替え可能
  - テスト時は自動的にモック実装を使用
- 環境に応じた実装の切り替えが可能
  - 本番環境では実際の実装を使用
  - テスト環境ではモック実装を使用
- 単体テストが書きやすい
  - インターフェースに基づいたテストが可能
  - 実装の詳細に依存しないテストが可能

### 3. 保守性の向上
- 実装の詳細が隠蔽される
  - アプリケーション層はインターフェースのみを参照
  - 永続化層の実装の詳細は`container/implementations.ts`に閉じ込める
- 変更の影響範囲が限定される
  - インターフェースの変更は実装に影響
  - 実装の変更はインターフェースに影響しない
- コードの意図が明確
  - 各層の責務が明確
  - 依存関係の方向が明確

### 4. シンプルなDI実装
- 外部ライブラリに依存しない
  - BFFは比較的シンプルな責務を持つため、複雑なDIコンテナは過剰
  - 学習コストと設定の追加を避けられる
  - ビルド時間の増加を防ぐ
- BFFの責務に適した実装
  - 必要最小限の機能を提供
  - 理解しやすい実装
- 起動時に1回だけ初期化
  - パフォーマンスへの影響を最小限に
  - メモリ効率が良い

## 注意点

### 1. BFFの責務
- フロントエンドとバックエンドの間のアダプター
- 認証/認可の処理
- リクエストの変換と転送

### 2. 実装の選択
- シンプルなDI実装で十分
- 外部ライブラリの導入は過剰
- 必要に応じて後から拡張可能
