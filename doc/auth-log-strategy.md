# Next.js におけるアクセスログと認証認可戦略の比較と設計指針

## 概要

Next.js App Routerを使用したBFFアプリケーションにおいて、認証認可とアクセスログを統合した設計戦略を検討し、最適なアプローチを提示します。特に、コードの簡潔性・型安全性・保守性を重視した共通ラップ関数による実装パターンを中心に解説します。

---

## 要件

本ドキュメントでは、以下の要件を満たすアクセスログ＋認証認可の処理設計について検討する：

- 各エンドポイント（`page.tsx`, `route.ts`, `server actions`）でアクセスログを記録する
- リクエスト処理の開始時間を記録し、処理完了までの時間をログ出力
- 認証・認可エラーが発生した場合でもアクセスログに残す
- エンドポイントのコードを簡潔に保つ（冗長な記述を避けたい）
- 型安全かつ再利用性の高い共通関数でラップしたい

---

## 各案の比較

### 案1：呼び出し元でログ記録とリダイレクトをすべて行う

#### 説明

- `auth()` や `checkPermission()` はセッション情報を返すのみ。
- 呼び出し元で以下の処理を明示的に記述：
  - 開始時間取得
  - 認証判定
  - ログ出力
  - 必要に応じてリダイレクト

#### メリット

- 責務が明確に分離されている
- ログ記録タイミングを完全に制御できる

#### デメリット

- 全エンドポイントに定型コードを書く必要があり、実装ミスや漏れが発生しやすい
- 冗長で可読性が低い
- メンテナンス性が悪い

---

### 案2：認証関数内部でログ出力とリダイレクトまで行う

#### 説明

- `checkSessionAndRedirect()` のような共通関数内で、
  - `auth()` による認証
  - ログ出力
  - 認証失敗時は即リダイレクト

#### メリット

- 呼び出し元のコードが短く簡潔
- ログ出力の記述漏れを防げる

#### デメリット

- ログ記録に必要な情報（ページ名など）を毎回引数で渡す必要がある
- 認証関数の責務が肥大化し、テストや再利用が難しくなる

---

### 案3：共通ラップ関数群による認証・ログの一元化

#### 説明

- 用途別のラップ関数群（`withAuthAndAccessLogForPage`、`withAuthAndAccessLogForApi`、`withAuthAndAccessLogForAction`）を用意し、以下の処理を一元管理：
  - リクエスト処理開始時間の記録
  - `auth()` による認証
  - 認証失敗時のログ出力とリダイレクト/エラー
  - ビジネスロジックの実行
  - 処理結果に応じたログ出力
  - 用途別の型安全性確保（Page用は `React.ReactElement` 返却など）

#### メリット

- ログ・認証・リダイレクトが統一され、呼び出し元が非常に簡潔になる
- ログ記録漏れが原理的に起こらない
- 拡張性・再利用性・型安全性が高い
- **認証とアクセスログの統合は妥当**: アクセスログには認証状態（ユーザー情報）が必須であり、両者は密接に関連している。BFF層での横断的関心事として適切に統合される（詳細は後述）

#### デメリット

- 用途別に関数を分ける必要があり、初見時には関数選択の学習コストがある
- 非同期関数でJSXを返す設計に慣れていない場合、混乱する可能性がある

---

## 案3における JSX との相性と型安全性の確保

Next.js の `page.tsx` は通常 React コンポーネント（JSX）を返す関数ですが、  
案3では次のような形式になります：

```tsx
export default async function Page() {
  return await withAuthAndAccessLogForPage("dashboard", {}, async (user) => {
    return <Dashboard user={user} />;
  });
}
```

### 型安全性の課題と対応

- **Page用**: `withAuthAndAccessLogForPage` は `Promise<React.ReactElement>` を返すことを型で保証
- **API Route用**: `withAuthAndAccessLogForApi<T>` はジェネリクスでAPI応答型を指定可能  
- **Server Actions用**: `withAuthAndAccessLogForAction<T>` はアクション戻り値型を指定可能

### 解決されたポイント

- 用途別関数分離により、それぞれの返却型が明確になった
- IDE補完やTypeScriptの型チェックが正しく機能する
- 各用途に最適化された型安全性を実現

---

## 案3の実装例：用途別に型安全な認証・ログラップ関数

### 推奨フォルダ構成（現在のプロジェクト準拠）

```
lib/
├── log/                               # 新規追加
│   ├── index.ts                       # ログライブラリのエントリーポイント
│   ├── config.ts                      # ログレベル、出力先等の設定
│   └── access-control/                # 新規追加
│       ├── types.ts                   # アクセス制御関連の型定義
│       └── withAccessLog.ts           # アクセス制御の全機能（関数群）
├── bff/
│   └── auth/                          # 既存
│       ├── auth.ts                    # NextAuth設定（既存）
│       ├── config.ts                  # 認証設定（既存）
│       └── types.ts                   # 認証型定義（既存）
└── shared/
    └── types/
        └── user.ts                    # User型定義（既存）
```

**既存ファイルとの統合ポイント：**
- 既存の `lib/bff/auth/` 構成をそのまま活用
- `lib/shared/types/user.ts` の既存User型を使用
- 新規追加は `lib/log/` フォルダのみ

### 実装ファイル

#### `/lib/log/config.ts` - ログ設定

```ts
// lib/log/config.ts
import pino, { LoggerOptions } from 'pino';

export const logConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};
```

#### `/lib/log/index.ts` - ログライブラリのエントリーポイント

```ts
// lib/log/index.ts
import pino from 'pino';
import { logConfig } from './config';

const logger = pino(logConfig);

export default logger;
```

#### `/lib/shared/types/user.ts` - User型定義（既存ファイル）

```ts
// lib/shared/types/user.ts（既存）
/**
 * ユーザー関連の型定義
 */

export interface User {
  id: string;
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}
```

#### `/lib/log/access-control/types.ts` - アクセス制御関連型定義

```ts
// lib/log/access-control/types.ts
import { User } from "@/lib/shared/types/user";

export type PageContext<
  Params extends Record<string, string> = {},
  SearchParams extends Record<string, string | string[] | undefined> = {}
> = {
  params?: Params;
  searchParams?: SearchParams;
};

export type AccessLogEntry = {
  page: string;
  user: User | null;
  status: "ok" | "unauthenticated" | "redirect" | "not-found" | "error";
  accessTime: string; // アクセス開始時刻（ISO 8601形式）
  duration: number; // 処理時間（ミリ秒）
  context?: object;
  error?: unknown;
};

export type LogStatus = AccessLogEntry["status"];
```

#### `/lib/log/access-control/withAccessLog.ts` - 統合実装

**注意**: この関数群は**認証（Authentication）**のみを行い、**認可（Authorization）**は行いません。ユーザーがログインしているかの確認のみで、特定のリソースへのアクセス権限チェックは各ビジネスロジック内で個別に実装してください。

```ts
// lib/log/access-control/withAccessLog.ts

import { auth } from "@/lib/bff/auth/auth"; // 既存のauth関数を使用
import { redirect } from "next/navigation";
import { User } from "@/lib/shared/types/user";
import logger from "@/lib/log"; // ログライブラリ
import type { PageContext, AccessLogEntry, LogStatus } from "./types";

// ========== ユーティリティ関数 ==========
function getErrorStatus(e: unknown): LogStatus {
  if (typeof e === "object" && e !== null && "digest" in e) {
    const digest = (e as { digest?: string }).digest;
    if (digest === "NEXT_REDIRECT") return "redirect";
    if (digest === "NEXT_NOT_FOUND") return "not-found";
  }
  return "error";
}

function logAccess(entry: AccessLogEntry) {
  logger.info(entry, `Access log: ${entry.page}`);
}

// ========== 認証必須関数群 ==========

// page.tsx専用の認証・アクセスログ関数（React.ReactElementを返すことを型で保証）
export async function withAuthAndAccessLogForPage<
  Params extends Record<string, string> = {},
  SearchParams extends Record<string, string | string[] | undefined> = {}
>(
  pageName: string,
  context: PageContext<Params, SearchParams> = {},
  logic: (user: User, context: PageContext<Params, SearchParams>) => Promise<React.ReactElement>
): Promise<React.ReactElement> {
  const accessTime = new Date();
  const accessTimeISO = accessTime.toISOString();
  const session = await auth();

  if (!session?.user) {
    logAccess({
      page: pageName,
      user: null,
      status: "unauthenticated",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      context,
    });
    redirect("/login");
  }

  try {
    const result = await logic(session.user, context);
    logAccess({
      page: pageName,
      user: session.user,
      status: "ok",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      context,
    });
    return result;
  } catch (e) {
    const status = getErrorStatus(e);

    logAccess({
      page: pageName,
      user: session.user,
      status,
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      context,
      error: e,
    });

    throw e;
  }
}

// API Route用の認証・アクセスログ関数
export async function withAuthAndAccessLogForApi<T>(
  routeName: string,
  logic: (user: User) => Promise<T>
): Promise<T> {
  const accessTime = new Date();
  const accessTimeISO = accessTime.toISOString();
  const session = await auth();

  if (!session?.user) {
    logAccess({
      page: routeName,
      user: null,
      status: "unauthenticated",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
    });
    throw new Error("Unauthorized");
  }

  try {
    const result = await logic(session.user);
    logAccess({
      page: routeName,
      user: session.user,
      status: "ok",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
    });
    return result;
  } catch (e) {
    const status = getErrorStatus(e);

    logAccess({
      page: routeName,
      user: session.user,
      status,
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      error: e,
    });
    throw e;
  }
}

// Server Actions用の認証・アクセスログ関数
export async function withAuthAndAccessLogForAction<T>(
  actionName: string,
  logic: (user: User) => Promise<T>
): Promise<T> {
  const accessTime = new Date();
  const accessTimeISO = accessTime.toISOString();
  const session = await auth();

  if (!session?.user) {
    logAccess({
      page: actionName,
      user: null,
      status: "unauthenticated",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
    });
    throw new Error("Unauthorized");
  }

  try {
    const result = await logic(session.user);
    logAccess({
      page: actionName,
      user: session.user,
      status: "ok",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
    });
    return result;
  } catch (e) {
    const status = getErrorStatus(e);

    logAccess({
      page: actionName,
      user: session.user,
      status,
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      error: e,
    });
    throw e;
  }
}

// 認証不要のServer Actions用のアクセスログ関数
export async function withAccessLogForPublicAction<T>(
  actionName: string,
  logic: () => Promise<T>
): Promise<T> {
  const accessTime = new Date();
  const accessTimeISO = accessTime.toISOString();

  try {
    const result = await logic();
    logAccess({
      page: actionName,
      user: null,
      status: "ok",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
    });
    return result;
  } catch (e) {
    const status = getErrorStatus(e);

    logAccess({
      page: actionName,
      user: null,
      status,
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      error: e,
    });
    throw e;
  }
}

// 認証不要のページ用のアクセスログ関数
export async function withAccessLogForPublicPage<
  Params extends Record<string, string> = {},
  SearchParams extends Record<string, string | string[] | undefined> = {}
>(
  pageName: string,
  context: PageContext<Params, SearchParams> = {},
  logic: (context: PageContext<Params, SearchParams>) => Promise<React.ReactElement>
): Promise<React.ReactElement> {
  const accessTime = new Date();
  const accessTimeISO = accessTime.toISOString();

  try {
    const result = await logic(context);
    logAccess({
      page: pageName,
      user: null, // 認証不要のため常にnull
      status: "ok",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      context,
    });
    return result;
  } catch (e) {
    const status = getErrorStatus(e);

    logAccess({
      page: pageName,
      user: null,
      status,
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      context,
      error: e,
    });

    throw e;
  }
}

// 認証不要のAPI Route用のアクセスログ関数
export async function withAccessLogForPublicApi<T>(
  routeName: string,
  logic: () => Promise<T>
): Promise<T> {
  const accessTime = new Date();
  const accessTimeISO = accessTime.toISOString();

  try {
    const result = await logic();
    logAccess({
      page: routeName,
      user: null,
      status: "ok",
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
    });
    return result;
  } catch (e) {
    const status = getErrorStatus(e);
    logAccess({
      page: routeName,
      user: null,
      status,
      accessTime: accessTimeISO,
      duration: Date.now() - accessTime.getTime(),
      error: e,
    });
    throw e;
  }
}

```

---

## 関数選択のガイドライン

| 画面/API種別 | 認証要否 | 使用関数 | 特徴 |
|-------------|---------|---------|------|
| ダッシュボード、マイページ等 | 必須 | `withAuthAndAccessLogForPage` | 認証チェック + リダイレクト |
| ログイン、新規登録等 | 不要 | `withAccessLogForPublicPage` | ログ記録のみ |
| プライベートAPI | 必須 | `withAuthAndAccessLogForApi` | 認証チェック + エラー返却 |
| パブリックAPI（ヘルスチェック等） | 不要 | `withAccessLogForPublicApi` | ログ記録のみ |
| ユーザーアクション（更新等） | 必須 | `withAuthAndAccessLogForAction` | 認証チェック + エラー返却 |
| パブリックアクション（ユーザー作成等） | 不要 | `withAccessLogForPublicAction` | ログ記録のみ |

### 設計方針の明確化

- **認証必須関数**: セキュリティ境界として機能し、未認証時は即座にリダイレクト/エラー
- **認証不要関数**: パフォーマンス追跡とアクセス解析を目的としたログ記録のみ
- **共通点**: どちらも処理時間測定とエラーハンドリングを統一的に実行
- **相違点**: 認証チェックの有無とエラー時の処理（リダイレクト vs ログ記録のみ）

---

## 使用例：現在のプロジェクト構造に対応

#### 質問一覧ページ（認証必須）

```tsx
// app/questions/page.tsx（既存ファイルの改修）

import { withAuthAndAccessLogForPage } from "@/lib/log/access-control/withAccessLog";
import QuestionList from "./_components/QuestionList";
import ExamFilter from "./_components/ExamFilter";

type SearchParams = { 
  exam?: string; 
  difficulty?: string; 
  category?: string; 
};

export default async function QuestionsPage({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) {
  return await withAuthAndAccessLogForPage(
    "questions-list", 
    { searchParams }, 
    async (user, { searchParams }) => {
      // 既存のコンポーネントをそのまま使用
      return (
        <div>
          <ExamFilter />
          <QuestionList 
            userId={user.id} 
            filters={searchParams} 
          />
        </div>
      );
    }
  );
}
```

#### 質問詳細ページ（認証必須）

```tsx
// app/questions/[id]/page.tsx（既存ファイルの改修）

import { withAuthAndAccessLogForPage } from "@/lib/log/access-control/withAccessLog";
import QuestionDetail from "../_components/QuestionDetail";

type Params = { id: string };

export default async function QuestionDetailPage({ 
  params 
}: { 
  params: Params 
}) {
  return await withAuthAndAccessLogForPage(
    "question-detail", 
    { params }, 
    async (user, { params }) => {
      // 既存のコンポーネントをそのまま使用
      return <QuestionDetail questionId={params.id} userId={user.id} />;
    }
  );
}
```

#### ログインページ（認証不要）

```tsx
// app/login/page.tsx（既存ファイルの改修）

import { withAccessLogForPublicPage } from "@/lib/log/access-control/withAccessLog";
import LoginForm from "./_components/LoginForm";

export default async function LoginPage() {
  return await withAccessLogForPublicPage("login", {}, async () => {
    // 既存のコンポーネントをそのまま使用
    return <LoginForm />;
  });
}
```

#### 新規登録ページ（認証不要）

```tsx
// app/register/page.tsx（既存ファイルの改修）

import { withAccessLogForPublicPage } from "@/lib/log/access-control/withAccessLog";
import RegisterForm from "./_components/RegisterForm";

type SearchParams = { redirect?: string };

export default async function RegisterPage({ 
  searchParams 
}: { 
  searchParams: SearchParams 
}) {
  return await withAccessLogForPublicPage(
    "register", 
    { searchParams }, 
    async ({ searchParams }) => {
      const redirectUrl = searchParams.redirect ?? "/questions";
      // 既存のコンポーネントをそのまま使用
      return <RegisterForm redirectUrl={redirectUrl} />;
    }
  );
}
```

### Server Actions用の使用例

```tsx
// lib/bff/server-actions/userActions.ts（既存ファイルの改修）

import { withAuthAndAccessLogForAction } from "@/lib/log/access-control/withAccessLog";

export async function updateUserProfile(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  
  return await withAuthAndAccessLogForAction("update-user-profile", async (user) => {
    // 既存のビジネスロジックをそのまま使用
    const updatedUser = await updateUserInDB(user.id, { name, email });
    return { success: true, user: updatedUser };
  });
}

export async function deleteUserAccount(userId: string) {
  return await withAuthAndAccessLogForAction("delete-user-account", async (user) => {
    // セキュリティチェック（認可処理の例）
    if (user.id !== userId && user.role !== 'ADMIN') {
      throw new Error('Unauthorized to delete this account');
    }
    
    await deleteUserFromDB(userId);
    return { success: true };
  });
}
```

この構成により、**実装ミスを防ぎつつ、責務が明確で保守性の高いログ＋認証アーキテクチャ**が構築できます。

---

## 認証とアクセスログを1つの関数で行うことの妥当性

### BFF層における横断的関心事の統合

**認証チェックとアクセスログ記録を1つの関数で行うことは、BFF（Backend for Frontend）層では妥当**です。以下の理由があります：

#### 技術的妥当性

1. **密接な依存関係**: アクセスログには認証状態（ユーザーID、認証時刻等）が必須の情報として含まれる
2. **実行順序の固定**: 認証チェック → ログ記録 → ビジネスロジック実行の順序は常に同じ
3. **エラーハンドリングの一貫性**: 認証失敗時のログ記録とリダイレクト処理が統一される
4. **型安全性の確保**: 認証済みユーザー情報を安全にビジネスロジックに渡せる

#### 実装上のメリット

1. **DRY原則の実現**: 全エンドポイントでの定型的なボイラープレートコード削減
2. **実装漏れの防止**: 認証チェックやログ記録の書き忘れが原理的に発生しない
3. **保守性の向上**: 認証・ログ処理の変更が1箇所に集約される
4. **テスタビリティ**: 認証・ログ・ビジネスロジックが明確に分離される

#### 責務の適切な分割

- **認証・ログ関数の責務**: 認証チェック、アクセスログ記録、エラーハンドリング
- **ビジネスロジックの責務**: 実際の業務処理、認可チェック、データ操作
- **明確な境界**: ユーザー情報を受け取った後の処理は完全にビジネスロジック側の責務

### 注意点：認証と認可の区別

この関数群では**認証（Authentication）のみ**を行い、**認可（Authorization）は含まない**ことが重要です：

- **認証**: 「誰がアクセスしているか」の確認（ログイン状態のチェック）
- **認可**: 「そのユーザーが特定のリソースにアクセスする権限があるか」の確認

認可処理は各ビジネスロジック内で個別に実装し、適切な責務分離を維持してください。

---

## 補足：AccessLogEntryの設計について

### accessTime と duration の役割分担

AccessLogEntryでは、アクセス時刻（accessTime）と処理時間（duration）の両方を記録しています。

#### accessTime（アクセス開始時刻）

**記録する理由：**
- **アクセスパターンの分析**: 時間帯別の利用状況把握
- **セキュリティ監査**: 不正アクセスの時系列追跡
- **法的要求**: コンプライアンス対応でアクセス時刻の記録が必要
- **ビジネス分析**: ユーザーの行動パターン分析

#### duration（処理時間）

**記録する理由：**
- **パフォーマンス監視**: 処理時間が主要な関心事
- **ボトルネック特定**: 遅いエンドポイントの特定
- **SLA管理**: サービスレベル合意の監視
- **集計の簡易性**: 平均処理時間などの計算が直接可能

#### pinoのtimestampとの使い分け

- **pino timestamp**: ログエントリが記録された時刻（処理完了時）
- **accessTime**: リクエストが開始された時刻
- **duration**: 実際の処理時間（ミリ秒）

**実装例：**
```ts
const accessTime = new Date();
const accessTimeISO = accessTime.toISOString(); // ISO形式の文字列
// ... 処理実行 ...
const duration = Date.now() - accessTime.getTime(); // 処理時間

logAccess({
  page: "example",
  accessTime: accessTimeISO, // アクセス開始時刻
  duration,   // 処理時間
  // ... その他のフィールド
});
```

この設計により、必要十分な情報を効率的に記録できます。



