# Next.js Overview

## Server Actions とフォームの実装

### Server Actions の基本
Server Actionsは、Next.jsでフォーム送信やデータ更新を処理するための機能です。
クライアントサイドのJavaScriptが無効な環境でも動作する、プログレッシブエンハンスメントをサポートしています。

### フォーム関連フック

#### useFormState
フォームの状態管理とServer Actionの実行を結びつけるフックです。

```tsx
const [state, formAction] = useFormState(serverAction, initialState);
```

- `state`: Server Actionの実行結果を保持
- `formAction`: フォームのaction属性に設定する関数
- `serverAction`: 実行するServer Action
- `initialState`: 初期状態

##### Server Actionの引数について
Server Action関数は必ず2つの引数を受け取ります：

```typescript
async function serverAction(
  prevState: State | null,  // 前回の状態
  formData: FormData       // フォームデータ
) {
  // ...
}
```

1. 第1引数 `prevState`
   - useFormStateフックによって自動的に渡される前回の状態
   - フォームの送信が複数回行われた場合、前回の結果を参照可能
   - `null`は初期状態を表す

2. 第2引数 `formData`
   - フォーム送信時に自動的に渡されるフォームデータ
   - フォームの各フィールドは`name`属性で指定した名前で取得可能

##### prevStateの活用例

1. 送信回数のカウント
```typescript
async function submitWithCount(
  prevState: { count: number } | null,
  data: FormData
) {
  const currentCount = (prevState?.count ?? 0) + 1;
  return { count: currentCount };
}
```

2. エラーメッセージの累積
```typescript
async function submitWithErrors(
  prevState: { errors: string[] } | null,
  data: FormData
) {
  const newError = "新しいエラーが発生しました";
  return { errors: [...(prevState?.errors ?? []), newError] };
}
```

3. マルチステップフォーム
```typescript
async function multiStepSubmit(
  prevState: { step: number; data: any } | null,
  formData: FormData
) {
  const step = prevState?.step ?? 1;
  return { 
    step: step + 1,
    data: { ...prevState?.data, [step]: Object.fromEntries(formData) }
  };
}
```

prevStateを使用する利点：
- フォーム送信間でのデータ保持
- マルチステップフォームの実装
- エラーの履歴管理
- 処理の進行状況の追跡

ただし、単純なフォームでは、エラー状態の返却程度の使用で十分な場合が多いです。

#### useFormStatus
フォームの送信状態を取得するフックです。

```tsx
const { pending } = useFormStatus();
```

- `pending`: フォーム送信中かどうかを示すブール値

### 実装上の注意点

1. コンポーネントの分離
`useFormStatus`フックには以下の制限があります：
- Form Actionを使用するフォームの中でのみ使用可能
- 独立したコンポーネント内で呼び出す必要がある

例：
```tsx
// ✅ 正しい実装：子コンポーネントとして分離
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? '送信中...' : '送信'}
    </button>
  );
}

// 親コンポーネント
export function Form() {
  const [state, formAction] = useFormState(serverAction, null);
  return (
    <form action={formAction}>
      {/* ... */}
      <SubmitButton />
    </form>
  );
}
```

2. 状態の共有
- 子コンポーネントは、親フォームのServer Action状態を自動的に取得
- React Context APIを利用して状態が共有される
- 特別な設定なしで送信状態に基づいたUI更新が可能

### ベストプラクティス
1. 送信ボタンは必ず独立したコンポーネントとして実装
2. フォームの状態に応じたUI更新（ボタンの無効化、ローディング表示など）を適切に実装
3. エラーハンドリングとユーザーフィードバックを考慮した設計

## Next-Auth による認証実装

### 1. 基本設定

Next-Authの設定は`lib/bff/auth/config.ts`で一元管理されています：

```typescript
import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // 認証プロバイダーの設定
      credentials: {
        loginId: { label: "Login ID", type: "text" },
        password: { label: "Password", type: "password" },
        user: { label: "User", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.user) return null;
        
        try {
          const user = JSON.parse(credentials.user) as AuthResponse;
          return {
            id: user.id,
            role: user.role
          };
        } catch (error) {
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7日間
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
  },
  callbacks: {
    // JWTの生成時のコールバック
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    // セッション生成時のコールバック
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
};
```

### 2. 認証フローの詳細

#### ログインフロー

1. **ユーザー入力**
```typescript
interface LoginCredentials {
  loginId: string;
  password: string;
}
```

2. **Server Action での処理**
```typescript
async function login(prevState: any, formData: FormData) {
  const credentials = {
    loginId: formData.get('loginId'),
    password: formData.get('password')
  };

  // バックエンドAPIでの認証
  const authResponse = await userClient.login(credentials);
  
  // Next-Authでの認証
  const result = await signIn('credentials', {
    user: JSON.stringify(authResponse),
    redirect: false
  });

  if (!result?.ok) {
    return { error: 'ログインに失敗しました' };
  }

  redirect('/dashboard');
}
```

3. **JWTの生成と管理**
- `jwt`コールバックでトークンにユーザー情報を付与
- `session`コールバックでセッションにユーザー情報を反映
- JWTには必要最小限の情報（`id`と`role`）のみを含める

### 3. セキュリティ考慮事項

1. **トークン管理**
- JWTの有効期限を7日間に設定
- 必要最小限の情報のみをトークンに格納
- セッションストレージはクライアントサイド（JWT）を使用

2. **認証エラーハンドリング**
- カスタムエラーページの設定
- エラーメッセージの適切な表示
- リダイレクト先の制御

### 4. 型安全性の確保

```typescript
// 認証レスポンスの型定義
interface AuthResponse {
  id: string;
  role: string;
}

// セッション型の拡張
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"]
  }
}
```

### 5. ミドルウェアでの認証チェック

```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*'
  ]
};

export async function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 管理者ページへのアクセス制御
  if (
    request.nextUrl.pathname.startsWith('/admin') &&
    session.user.role !== 'ADMIN'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
```

### 6. 認証状態の利用

```typescript
// サーバーコンポーネントでの使用
async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div>
      <h1>ようこそ、{session.user.id}さん</h1>
      {/* ... */}
    </div>
  );
}

// クライアントコンポーネントでの使用
'use client';

function UserMenu() {
  const { data: session } = useSession();
  
  if (!session) {
    return null;
  }
  
  return (
    <div>
      <span>{session.user.id}</span>
      <button onClick={() => signOut()}>ログアウト</button>
    </div>
  );
}
```

このように、Next-Authを使用することで、セキュアで型安全な認証システムを実現しています。JWTベースの認証により、ステートレスなセッション管理が可能となり、アプリケーションのスケーラビリティも確保されています。

### 7. JWTとユーザー情報の設計方針

Next-Authの実装において、JWTに含める情報は以下の2つに限定します：

1. **ユーザーID（`id`）**
   - 不変の識別子
   - ユーザーを一意に特定するために必要最小限の情報

2. **権限情報（`role`）**
   - アクセス制御に必要な情報
   - 認可の判定に使用

```typescript
// JWTに含める情報の型定義
interface AuthResponse {
  id: string;
  role: string;
}

// 表示用の詳細な型定義
interface UserDetails {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  // その他の表示用情報
}
```

#### ユーザー情報の取得方法

表示用のユーザー情報は、BFFを介して取得します：

```typescript
// lib/bff/web-client/user.ts
export class UserClient {
  async getCurrentUser(): Promise<UserDetails> {
    return get<UserDetails>('/api/users/me', {
      next: {
        // キャッシュの設定
        revalidate: 60,  // 1分間キャッシュ
        tags: ['user-info']  // キャッシュの制御用タグ
      }
    });
  }

  async updateUser(data: UpdateUserDto): Promise<UserDetails> {
    const result = await put<UserDetails>('/api/users/me', data);
    // 更新後にキャッシュを再検証
    revalidateTag('user-info');
    return result;
  }
}

// app/components/UserProfile.tsx
async function UserProfile() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userClient = new UserClient();
  const userDetails = await userClient.getCurrentUser();

  return (
    <div>
      <h1>ようこそ、{userDetails.name}さん</h1>
      <p>メール: {userDetails.email}</p>
      {userDetails.avatarUrl && (
        <img src={userDetails.avatarUrl} alt="プロフィール画像" />
      )}
      {/* その他の表示情報 */}
    </div>
  );
}
```

#### この設計のメリット

1. **セキュリティ**
   - JWTに含まれる情報を最小限に抑えることで、トークンの盗難リスクを最小化
   - 変更可能な情報をトークンに含めないことで、古い情報が表示されるリスクを排除

2. **保守性**
   - ユーザー情報の更新時にJWTの再発行が不要
   - 表示用の情報はBFFを介して取得するため、表示項目の追加・変更が容易

3. **パフォーマンス**
   - JWTのサイズを最小限に保つことで、リクエストヘッダーのサイズを抑制
   - BFFでのキャッシュ制御により、バックエンドへのリクエストを最適化可能

#### キャッシュ戦略

1. **キャッシュの設定**
   ```typescript
   // キャッシュ期間の設定
   const CACHE_TIMES = {
     userInfo: 60,  // 1分
     preferences: 300,  // 5分
     staticData: 3600  // 1時間
   } as const;
   ```

2. **キャッシュの再検証**
   ```typescript
   // 情報更新時のキャッシュ制御
   async function updateUserProfile(data: UpdateProfileDto) {
     await userClient.updateProfile(data);
     // 関連するキャッシュを再検証
     revalidateTag('user-info');
   }
   ```

3. **エラーハンドリング**
   ```typescript
   async function UserProfile() {
     try {
       const userDetails = await userClient.getCurrentUser();
       return <UserProfileView user={userDetails} />;
     } catch (error) {
       // エラー時のフォールバックUI
       return <UserProfileError />;
     }
   }
   ```

このように、JWTには認証に必要な最小限の情報のみを含め、表示用の情報は適切なキャッシュ戦略とともにBFFを介して取得する設計とします。これにより、セキュアでパフォーマンスの高い実装を実現します。

## バリデーション（Zod）

### 概要
Zodは、TypeScriptファーストな型検証ライブラリです。
スキーマ定義から型が自動的に推論され、ランタイムでの型安全性を確保できます。

### スキーマの定義

```typescript
import { z } from 'zod';

// ログインフォームのスキーマ
export const loginSchema = z.object({
  loginId: z
    .string()
    .min(1, 'ユーザーIDは必須です')
    .max(50, 'ユーザーIDは50文字以内で入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください'),
});

// 型の自動生成
export type LoginFormData = z.infer<typeof loginSchema>;
```

### バリデーションの実行

```typescript
// Server Actionsでの使用例
async function login(prevState: State | null, data: FormData) {
  const formData = {
    loginId: data.get('loginId'),
    password: data.get('password'),
  };
  
  // バリデーション実行
  const validated = loginSchema.safeParse(formData);
  
  if (!validated.success) {
    // エラーメッセージをフィールドごとにマッピング
    const errors = validated.error.errors.reduce((acc, err) => {
      const field = err.path[0] as string;
      acc[field] = { message: err.message };
      return acc;
    }, {} as Record<string, { message: string }>);
    
    return { errors };
  }
  
  // バリデーション成功時は型付きのデータにアクセス可能
  const validData = validated.data;  // LoginFormData型
}
```

### よく使用するバリデーションルール

```typescript
import { z } from 'zod';

const schema = z.object({
  // 文字列
  username: z
    .string()
    .min(1, '必須項目です')
    .max(50, '50文字以内で入力してください')
    .regex(/^[a-zA-Z0-9_-]+$/, '半角英数字、ハイフン、アンダースコアのみ使用可能です'),

  // メールアドレス
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .toLowerCase(), // 小文字に正規化

  // 数値
  age: z
    .number()
    .int('整数を入力してください')
    .min(0, '0以上の値を入力してください')
    .max(150, '150以下の値を入力してください'),

  // 日付
  birthDate: z
    .date()
    .min(new Date('1900-01-01'), '1900年以降の日付を入力してください')
    .max(new Date(), '未来の日付は入力できません'),

  // 配列
  tags: z
    .array(z.string())
    .min(1, '1つ以上選択してください')
    .max(5, '5つまで選択可能です'),

  // オプショナル
  bio: z
    .string()
    .max(1000, '1000文字以内で入力してください')
    .optional(),

  // パスワード確認
  password: z
    .string()
    .min(8, '8文字以上で入力してください'),
  confirmPassword: z
    .string()
});

// パスワード一致の検証
const withPasswordConfirm = schema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'], // エラーを表示するフィールド
  }
);
```

### エラーハンドリング

```typescript
// safeParseの結果の型
type ValidationResult = {
  success: true;
  data: TypeFromSchema;
} | {
  success: false;
  error: ZodError;
};

// エラーオブジェクトの構造
type ZodError = {
  errors: {
    path: (string | number)[];  // エラーが発生したフィールドのパス
    message: string;            // エラーメッセージ
    code: string;              // エラーコード
  }[];
};
```

#### エラーパスについて

pathは配列になっており、ネストされたオブジェクトの場合にそのパスを表現します。

```typescript
// ネストされたスキーマの例
const addressSchema = z.object({
  address: z.object({
    postal: z.string().regex(/^\d{3}-\d{4}$/, '正しい郵便番号形式で入力してください'),
    prefecture: z.string().min(1, '都道府県を選択してください'),
    city: z.string().min(1, '市区町村を入力してください'),
  }),
  contacts: z.array(z.object({
    type: z.enum(['email', 'phone']),
    value: z.string(),
  })),
});

// バリデーション実行
const result = addressSchema.safeParse({
  address: {
    postal: '123-456',  // 不正な郵便番号
    prefecture: '',     // 空の都道府県
    city: '渋谷区',
  },
  contacts: [
    { type: 'email', value: '' },  // 空のメール
    { type: 'phone', value: '090-1234-5678' },
  ],
});

if (!result.success) {
  // エラーの例
  console.log(result.error.errors);
  // [
  //   {
  //     path: ['address', 'postal'],     // address.postal のエラー
  //     message: '正しい郵便番号形式で入力してください',
  //     code: 'invalid_string'
  //   },
  //   {
  //     path: ['address', 'prefecture'], // address.prefecture のエラー
  //     message: '都道府県を選択してください',
  //     code: 'too_small'
  //   },
  //   {
  //     path: ['contacts', 0, 'value'],  // contacts[0].value のエラー
  //     message: '必須項目です',
  //     code: 'too_small'
  //   }
  // ]
}

// エラーメッセージのマッピング例
function mapErrors(zodError: ZodError) {
  return zodError.errors.reduce((acc, err) => {
    if (err.path.length === 1) {
      // トップレベルのフィールド
      acc[err.path[0]] = { message: err.message };
    } else if (err.path.length === 2) {
      // 1階層ネストしたフィールド
      const [parent, child] = err.path;
      if (!acc[parent]) acc[parent] = {};
      acc[parent][child] = { message: err.message };
    } else if (err.path.length === 3) {
      // 配列要素内のフィールド
      const [parent, index, field] = err.path;
      if (!acc[parent]) acc[parent] = [];
      if (!acc[parent][index]) acc[parent][index] = {};
      acc[parent][index][field] = { message: err.message };
    }
    return acc;
  }, {} as Record<string, any>);
}

// 補足: reduceとaccumulatorについて
// - reduce: 配列の要素を順に処理し、単一の値にまとめるメソッド
// - acc: アキュムレータ（accumulator）の略で、処理の途中結果を保持
// - {} as Record<string, any>: 空オブジェクトを初期値として、
//   そこにエラーメッセージを順次追加していく

// 使用例
const errors = mapErrors(result.error);
console.log(errors);
// {
//   address: {
//     postal: { message: '正しい郵便番号形式で入力してください' },
//     prefecture: { message: '都道府県を選択してください' }
//   },
//   contacts: [
//     { value: { message: '必須項目です' } }
//   ]
// }
```

このように、`path`配列は以下のような場合に複数の要素を持ちます：

1. ネストされたオブジェクト
   - `['address', 'postal']` → `address.postal`
   - `['address', 'prefecture']` → `address.prefecture`

2. 配列の要素
   - `['contacts', 0, 'value']` → `contacts[0].value`
   - `['contacts', 1, 'type']` → `contacts[1].type`

3. より深いネスト
   - `['user', 'addresses', 0, 'postal']` → `user.addresses[0].postal`

単純なフォームの場合は`path[0]`だけで十分ですが、複雑なフォームの場合はパス全体を考慮したエラーハンドリングが必要になります。

#### エラーメッセージのカスタマイズ
```typescript
const schema = z.object({
  username: z.string({
    required_error: 'ユーザー名は必須です',
    invalid_type_error: '文字列を入力してください',
  }),
});
```

### ベストプラクティス

1. スキーマの集約
   - バリデーションスキーマは`lib/shared/validation`などの専用ディレクトリに集約
   - 関連するスキーマをまとめたファイルで管理（例：`auth.ts`, `user.ts`）

2. 型の活用
   - `z.infer<typeof schema>`で型を生成
   - 生成した型をコンポーネントやServer Actionsで活用

3. エラーメッセージ
   - ユーザーフレンドリーなメッセージを日本語で提供
   - フィールドごとに適切なコンテキストを含めたメッセージを設定

4. バリデーションの使い分け
   - クライアントサイド: フォームのリアルタイムバリデーション
   - サーバーサイド: 最終的な入力値の検証

## フォーム実装の改善パターン

### 1. クライアントサイドバリデーションの強化

#### カスタムフックによる状態管理
```typescript
function useFormValidation(schema: typeof loginSchema) {
  const [clientErrors, setClientErrors] = useState<ErrorState>({
    loginId: { message: '' },
    password: { message: '' }
  });

  const validateField = useCallback((name: FieldName, value: string) => {
    const fieldSchema = schema.innerType().shape[name];
    // ... バリデーションロジック
  }, [schema]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    // フォーム送信時のバリデーション
  }, [schema]);

  return { clientErrors, validateField, handleSubmit };
}
```

効果：
- バリデーションロジックの再利用性向上
- コンポーネントのロジックと表示の分離
- 型安全性の確保
- テストの容易さ

#### フィールドごとのリアルタイムバリデーション
```typescript
<input
  onBlur={(e) => validateField(e.target.name as FieldName, e.target.value)}
  aria-invalid={!!clientErrors.loginId}
  aria-describedby={clientErrors.loginId ? "loginId-error" : undefined}
/>
```

効果：
- ユーザー体験の向上（即時フィードバック）
- エラー状態の視覚的表示
- アクセシビリティの改善

#### フィールド単位のバリデーション

##### onBlurイベントによるバリデーション
```typescript
<input
  name="userId"
  type="text"
  onBlur={(e) => validateField(e.target.name as FieldName, e.target.value)}
  aria-invalid={!!clientErrors.userId}
/>
```

1. **バリデーションのタイミング**
- フォーカスが外れた時（onBlur）に実行
- 入力中（onChange）ではなくフォーカスが外れた時に実行することで：
  - 不要なバリデーション実行を防ぐ
  - ユーザーの入力を妨げない
  - パフォーマンスの最適化

2. **フィールド単位の処理**
```typescript
const validateField = useCallback((name: FieldName, value: string) => {
  const fieldSchema = {
    userId: schema.innerType().shape.userId,
    email: schema.innerType().shape.email,
    // ... 他のフィールド
  }[name];

  if (!fieldSchema) return;

  const result = fieldSchema.safeParse(value);
  if (!result.success) {
    // エラーがある場合、そのフィールドのみエラー状態を更新
    setClientErrors(prev => ({
      ...prev,
      [name]: { message: result.error.errors[0].message }
    }));
  } else {
    // エラーがない場合、そのフィールドのエラーをクリア
    setClientErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }
}, [schema]);
```

3. **メリット**
- リアルタイムフィードバック
  - ユーザーは各フィールドの入力完了時に即座にフィードバックを受け取れる
- 効率的なバリデーション
  - 必要なフィールドのみを検証
  - 全体のバリデーションは送信時のみ実行
- 良好なUX
  - 入力中の妨げにならない
  - 適切なタイミングでフィードバックを提供

4. **実装のポイント**
- フィールドごとのエラー状態管理
- アクセシビリティへの配慮（aria-invalid属性など）
- 適切なエラーメッセージの表示

このアプローチは、フォーム全体のバリデーション（送信時）と組み合わせることで、より完全なバリデーション戦略を実現します。

### 2. パフォーマンスの最適化

#### エラーメッセージのメモ化
```typescript
const ErrorMessage = useMemo(() => {
  return ({ error }: { error: { message: string } }) => (
    <p className="mt-2 text-base text-red-500 font-medium">{error.message}</p>
  );
}, []);
```

効果：
- 不要な再レンダリングの防止
- メモリ使用量の最適化
- パフォーマンスの向上

#### コールバック関数のメモ化
```typescript
const validateField = useCallback((name: FieldName, value: string) => {
  // バリデーションロジック
}, [schema]);
```

効果：
- 関数の再生成を防止
- 子コンポーネントの不要な再レンダリングを防止

### 3. 型安全性の向上

#### スキーマから型を生成
```typescript
type FieldName = keyof z.infer<typeof loginSchema>;
type ErrorState = Record<FieldName, { message: string }>;
```

効果：
- コンパイル時のエラー検出
- リファクタリングの安全性
- IDEのサポート向上

#### バリデーションの型チェック
```typescript
const result = schema.safeParse(data);
if (!result.success) {
  const errors = result.error.errors.reduce((acc, err) => {
    const field = err.path[0] as FieldName;
    acc[field] = { message: err.message };
    return acc;
  }, {} as ErrorState);
}
```

効果：
- ランタイムエラーの防止
- 型の一貫性の確保
- バグの早期発見

### 4. アクセシビリティの強化

#### ARIA属性の適切な使用
```typescript
<div role="group" aria-labelledby="loginId-label">
  <label id="loginId-label" htmlFor="loginId" aria-required="true">
    ユーザーID
  </label>
  <input
    aria-invalid={!!clientErrors.loginId}
    aria-describedby={clientErrors.loginId ? "loginId-error" : undefined}
  />
  {clientErrors.loginId && (
    <p id="loginId-error" role="alert">{clientErrors.loginId.message}</p>
  )}
</div>
```

効果：
- スクリーンリーダーのサポート
- キーボード操作のサポート
- エラー状態の適切な通知

### 5. Progressive Enhancementの維持

#### Server Actionsとクライアントバリデーションの併用
```typescript
<form 
  action={formAction}
  onSubmit={handleSubmit}
>
  // フォームの内容
</form>
```

効果：
- JavaScriptが無効な環境でも動作
- クライアントサイドの機能強化
- UXの段階的な向上

### 実装のベストプラクティス

1. **状態管理の分離**
   - カスタムフックによるロジックの分離
   - コンポーネントの責務の明確化
   - テスト容易性の向上

2. **型安全性の確保**
   - スキーマからの型生成
   - 厳密な型チェック
   - コンパイル時のエラー検出

3. **パフォーマンスの考慮**
   - メモ化による最適化
   - 不要な再レンダリングの防止
   - 効率的な状態更新

4. **アクセシビリティ**
   - ARIA属性の適切な使用
   - キーボード操作のサポート
   - エラー状態の明確な通知

5. **ユーザー体験**
   - リアルタイムバリデーション
   - 適切なエラーフィードバック
   - Progressive Enhancement

## Reactフックの活用

### useCallback

#### 基本概念と使用例の比較

##### useCallbackを使用しない場合
```typescript
function RegisterForm() {
  // コンポーネントが再レンダリングされるたびに新しい関数が作成される
  const validateField = (name: string, value: string) => {
    // バリデーションロジック
  };

  // 子コンポーネントは親の再レンダリングのたびに再レンダリングされる
  return (
    <form>
      <InputField onValidate={validateField} />
      <OtherComponent />
    </form>
  );
}
```

問題点：
- 毎回新しい関数が作成される
- メモリ効率が悪い
- 子コンポーネントの不要な再レンダリングが発生

##### useCallbackを使用する場合
```typescript
function RegisterForm() {
  // 依存配列が変更されない限り、同じ関数参照が維持される
  const validateField = useCallback((name: string, value: string) => {
    // バリデーションロジック
  }, []); // 空の依存配列

  // 子コンポーネントは関数参照が変更されない限り再レンダリングされない
  return (
    <form>
      <InputField onValidate={validateField} />
      <OtherComponent />
    </form>
  );
}
```

利点：
- 関数の再生成を防止
- メモリ使用量の最適化
- 子コンポーネントの不要な再レンダリングを防止

#### 実践的な使用例

##### 1. 外部の値に依存する場合の比較

使用しない場合：
```typescript
function FormWithSchema() {
  const [schema, setSchema] = useState(defaultSchema);

  // schemaが変更されなくても、コンポーネントの再レンダリングごとに関数が再生成される
  const validate = (value: string) => {
    return schema.safeParse(value);
  };

  return <input onChange={(e) => validate(e.target.value)} />;
}
```

使用する場合：
```typescript
function FormWithSchema() {
  const [schema, setSchema] = useState(defaultSchema);

  // schemaが変更されたときのみ関数が再生成される
  const validate = useCallback((value: string) => {
    return schema.safeParse(value);
  }, [schema]);

  return <input onChange={(e) => validate(e.target.value)} />;
}
```

##### 2. 子コンポーネントとの組み合わせ

使用しない場合：
```typescript
// 親コンポーネント
function ParentForm() {
  const handleSubmit = (data: FormData) => {
    // 送信処理
  };

  // handleSubmitが毎回新しく作成されるため、
  // ChildFormは常に再レンダリングされる
  return <ChildForm onSubmit={handleSubmit} />;
}

// 子コンポーネント
const ChildForm = React.memo(({ onSubmit }) => {
  return <form onSubmit={onSubmit}>{/* フォームの内容 */}</form>;
});
```

使用する場合：
```typescript
// 親コンポーネント
function ParentForm() {
  const handleSubmit = useCallback((data: FormData) => {
    // 送信処理
  }, []); // 依存配列が空なので関数は1回だけ作成される

  // handleSubmitは常に同じ参照を維持するため、
  // ChildFormは不要な再レンダリングを回避できる
  return <ChildForm onSubmit={handleSubmit} />;
}

// 子コンポーネント
const ChildForm = React.memo(({ onSubmit }) => {
  return <form onSubmit={onSubmit}>{/* フォームの内容 */}</form>;
});
```

#### パフォーマンスへの影響

1. **メモリ使用量**
- 使用しない場合：再レンダリングごとに新しい関数オブジェクトが作成される
- 使用する場合：関数オブジェクトが再利用される

2. **レンダリング最適化**
- 使用しない場合：子コンポーネントが不要な再レンダリングを行う可能性が高い
- 使用する場合：必要な時のみ子コンポーネントが再レンダリングされる

#### 使用を検討すべき状況

1. **必要な場合**
- 子コンポーネントにコールバック関数を渡す場合
- `useEffect`の依存配列に関数を含める場合
- 複雑な計算を含む関数の場合

2. **不要な場合**
- 単純なイベントハンドラ
- コンポーネント内でのみ使用する関数
- パフォーマンスの問題が発生していない場合

#### ベストプラクティス

1. **依存配列の適切な管理**
```typescript
// 良くない例
const validate = useCallback((value: string) => {
  return schema.safeParse(value); // schemaが依存配列にない
}, []); 

// 良い例
const validate = useCallback((value: string) => {
  return schema.safeParse(value);
}, [schema]);
```

2. **型安全性の確保**
```typescript
// 型付きの使用例
const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  // 処理
}, []);
```

3. **パフォーマンスの測定**
```typescript
// 開発時のデバッグ
const handleSubmit = useCallback((data: FormData) => {
  console.log('フォーム送信:', data);
  // 処理
}, []);
```

このように、`useCallback`は適切に使用することでアプリケーションのパフォーマンスを向上させることができますが、必要な場所で適切に使用することが重要です。

#### useCallbackとスキーマの関係

##### スキーマベースのバリデーション
```typescript
function useFormValidation(schema: typeof registerSchema) {
  const validateField = useCallback((name: FieldName, value: string) => {
    const fieldSchema = schema.innerType().shape[name];
    // バリデーションロジック
  }, [schema]);
}
```

1. **スキーマの役割**
- バリデーションルールの定義
  ```typescript
  const registerSchema = z.object({
    userId: z.string()
      .min(3, 'ユーザーIDは3文字以上である必要があります')
      .max(20, 'ユーザーIDは20文字以下である必要があります')
      .regex(/^[a-zA-Z0-9_]+$/, 'ユーザーIDは英数字とアンダースコアのみ使用できます'),
    email: z.string()
      .email('有効なメールアドレスを入力してください'),
    password: z.string()
      .min(8, 'パスワードは8文字以上である必要があります')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'パスワードは大文字、小文字、数字を含む必要があります'),
    confirmPassword: z.string()
  });
  ```
- 型情報の提供
  ```typescript
  type RegisterFormData = z.infer<typeof registerSchema>;
  ```
- エラーメッセージの定義
- カスタムバリデーションルール

2. **useCallbackとの関係**
- スキーマが変更されない限り、validateField関数は再生成されない
- 通常、スキーマは定数として定義されるため、実質的に関数は1回だけ生成される
- パフォーマンスの最適化に貢献

3. **メリット**
- 不要な関数の再生成を防止
- メモリ使用量の最適化
- 型安全性の確保
- バリデーションロジックの一元管理

4. **実装のポイント**
- スキーマは通常、別ファイルで定義し、インポートして使用
- 型推論を活用して、フィールド名やエラー型を自動生成
- カスタムフックで再利用可能なバリデーションロジックを作成

このように、useCallbackとスキーマを組み合わせることで、型安全で効率的なフォームバリデーションを実現できます。

#### useCallbackとuseEffectの比較

##### 基本的な違い

1. **目的の違い**
```typescript
// useCallback: 関数のメモ化
const handleSubmit = useCallback(() => {
  // フォーム送信処理
}, [dependencies]);

// useEffect: 副作用の実行
useEffect(() => {
  // マウント時やdependenciesの変更時に実行される処理
}, [dependencies]);
```

2. **実行タイミング**
- useCallback
  - 関数の定義のみを行い、即座には実行されない
  - 返された関数は、イベントハンドラなどで必要なときに実行される
  ```typescript
  const validateField = useCallback((value: string) => {
    return schema.safeParse(value);  // この時点では実行されない
  }, [schema]);
  
  // 実際の使用時に実行される
  <input onChange={(e) => validateField(e.target.value)} />
  ```

- useEffect
  - 依存配列の値が変更されるたびに、コールバック関数が自動的に実行される
  - コンポーネントのマウント/アンマウント時にも実行される
  ```typescript
  useEffect(() => {
    // コンポーネントマウント時や
    // formDataが変更されるたびに自動実行される
    validateForm(formData);
  }, [formData]);
  ```

3. **使用場面の違い**
- useCallback
  - パフォーマンス最適化が必要な場合
  - 子コンポーネントにコールバックを渡す場合
  - 依存配列に含まれる関数を他のフックで使用する場合
  ```typescript
  const memoizedCallback = useCallback(() => {
    doSomething(a, b);
  }, [a, b]);
  ```

- useEffect
  - データフェッチ
  - イベントリスナーの設定/解除
  - 外部システムとの同期
  ```typescript
  useEffect(() => {
    const subscription = api.subscribe(data);
    return () => subscription.unsubscribe(); // クリーンアップ
  }, []);
  ```

4. **戻り値の違い**
- useCallback
  - メモ化された関数を返す
  - 返された関数は後で実行できる
  ```typescript
  const handleClick = useCallback(() => {
    console.log('クリックされました');
  }, []); // 関数を返す
  ```

- useEffect
  - クリーンアップ関数を返すことができる（オプション）
  - 即座に実行される
  ```typescript
  useEffect(() => {
    console.log('マウントされました');
    return () => console.log('アンマウントされます');
  }, []); // 即座に実行される
  ```

##### 実践的な使い分け

1. **フォームバリデーションの例**
```typescript
// useCallback: バリデーション関数の定義
const validateField = useCallback((name: string, value: string) => {
  return schema.safeParse({ [name]: value });
}, [schema]);

// useEffect: 値の変更時に自動バリデーション
useEffect(() => {
  const result = validateField(fieldName, fieldValue);
  setErrors(result.success ? {} : result.error);
}, [fieldValue, validateField]);
```

2. **データフェッチの例**
```typescript
// useCallback: フェッチ関数の定義
const fetchData = useCallback(async () => {
  const response = await api.getData();
  return response.data;
}, []);

// useEffect: コンポーネントマウント時のデータ取得
useEffect(() => {
  fetchData().then(setData);
}, [fetchData]);
```

このように、`useCallback`と`useEffect`は異なる目的と使用場面を持つフックですが、しばしば組み合わせて使用されます。`useCallback`は関数の定義と最適化に、`useEffect`は副作用の実行に使用します。

##### フィールドスキーマの取得処理

1. **スキーマの構造とアクセス**
```typescript
// 全体のスキーマ定義
const registerSchema = z.object({
  userId: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string()
});

// 個別フィールドのスキーマ取得
const fieldSchema = {
  userId: registerSchema.innerType().shape.userId,    // userId用のバリデーションルール
  email: registerSchema.innerType().shape.email,      // email用のバリデーションルール
  password: registerSchema.innerType().shape.password, // password用のバリデーションルール
  confirmPassword: registerSchema.innerType().shape.confirmPassword
}[name]; // nameに一致するスキーマを取得
```

2. **処理の流れ**
```typescript
// 例: nameが"email"の場合
validateField("email", "test@example.com");

// ↓ 内部での処理

// 1. オブジェクトリテラルでフィールドごとのスキーマをマッピング
const schemaMap = {
  userId: /* userIdのスキーマ */,
  email: /* emailのスキーマ */,
  // ...
};

// 2. [name]でアクセス = schemaMap["email"]
// 該当フィールドのスキーマのみを取得
const fieldSchema = schemaMap[name];
```

3. **メリット**
- 型安全性
  ```typescript
  type FieldName = keyof typeof registerSchema.shape;
  // FieldName = "userId" | "email" | "password" | "confirmPassword"
  ```
- 効率的なバリデーション
  - 必要なフィールドのスキーマのみを使用
  - 他のフィールドのバリデーションルールは実行されない
- コードの可読性
  - スキーマのマッピングが明示的
  - フィールドとバリデーションルールの対応が分かりやすい

4. **innerType()とshapeについて**
- `innerType()`
  - Zodの内部型情報にアクセスするメソッド
  - リファインメント（refine）などの追加バリデーションを除いた基本スキーマを取得
- `shape`
  - オブジェクトスキーマの各フィールドの定義にアクセスするプロパティ
  - 各フィールドの個別のバリデーションルールを含む

5. **実装例**
```typescript
const validateField = useCallback((name: FieldName, value: string) => {
  // 1. 該当フィールドのスキーマを取得
  const fieldSchema = {
    userId: registerSchema.innerType().shape.userId,
    email: registerSchema.innerType().shape.email,
    password: registerSchema.innerType().shape.password,
    confirmPassword: registerSchema.innerType().shape.confirmPassword,
  }[name];

  if (!fieldSchema) return;

  // 2. 取得したスキーマでバリデーション実行
  const result = fieldSchema.safeParse(value);
  
  // 3. バリデーション結果に基づいてエラー状態を更新
  if (!result.success) {
    setClientErrors(prev => ({
      ...prev,
      [name]: { message: result.error.errors[0].message }
    }));
  } else {
    setClientErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }
}, [registerSchema]);
```

このように、フィールド名に基づいて適切なバリデーションルールを取得し、個別のフィールドに対してバリデーションを実行する仕組みになっています。

#### React Hook Formを使用する場合と使用しない場合の比較

##### 1. カスタムフックによる実装（React Hook Formを使用しない場合）

```typescript
function useFormValidation(schema: typeof registerSchema) {
  const [state, formAction] = useFormState(registerAction, null);
  const [clientErrors, setClientErrors] = useState<ErrorState>({
    userId: { message: '' },
    email: { message: '' },
    // ... 他のフィールド
  });

  const validateField = useCallback((name: FieldName, value: string) => {
    const fieldSchema = {
      userId: schema.innerType().shape.userId,
      email: schema.innerType().shape.email,
      // ... 他のフィールド
    }[name];

    if (!fieldSchema) return;

    const result = fieldSchema.safeParse(value);
    // エラー状態の更新ロジック
  }, [schema]);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    // フォーム送信時のバリデーション
  }, [schema]);

  return { state, formAction, clientErrors, validateField, handleSubmit };
}
```

**メリット：**
- Progressive Enhancement対応
  - JavaScriptが無効でも基本的な機能が動作
  - Server Actionsによるフォーム送信が可能
- 軽量
  - 追加のライブラリが不要
  - バンドルサイズの最適化
- Next.js 14の機能を最大限活用
  - Server ActionsとuseFormStateの統合
  - サーバーサイドでのバリデーション

**デメリット：**
- より多くのボイラープレートコードが必要
- 高度なフォーム機能は自前で実装が必要
- エラー状態の手動管理が煩雑
- 再利用性が限定的

##### 2. React Hook Formを使用する場合

```typescript
function RegisterForm() {
  const [serverState, formAction] = useFormState(registerAction, null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger
  } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: FormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    await formAction(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('userId')} />
      {errors.userId && <span>{errors.userId.message}</span>}
      {/* 他のフィールド */}
    </form>
  );
}
```

**メリット：**
1. **コードの簡潔さ**
   - ボイラープレートの削減
   - 宣言的なフォーム定義
   - エラー処理の自動化

2. **豊富な機能**
   - フィールドの状態管理（dirty, touched, etc）
   - バリデーションモードの柔軟な設定
   - 非同期バリデーション
   - フォーム状態の監視

3. **型安全性**
   - スキーマからの自動的な型推論
   - 入力値の型チェック
   - IDEのサポート

4. **パフォーマンス**
   - 最適化された再レンダリング
   - メモ化された値の活用
   - 効率的な状態更新

**トレードオフ：**
1. **Progressive Enhancement**
   - JavaScriptが必須
   - 非JS環境での機能制限

2. **バンドルサイズ**
   - 追加のライブラリ依存
   - 初期ロード時間への影響

3. **学習コスト**
   - 新しいAPIの習得
   - ベストプラクティスの理解

##### 実装パターンの選択基準

以下の場合、React Hook Formの使用を検討：

1. **機能要件**
   - 複雑なフォーム操作
   - リッチなバリデーション
   - 詳細な状態管理が必要

2. **開発効率**
   - 開発速度の重視
   - コードの保守性
   - チームの習熟度

3. **ユーザー環境**
   - モダンブラウザ対応
   - JavaScript有効環境が前提
   - 高速なネットワーク

4. **プロジェクトの規模**
   - 中〜大規模アプリケーション
   - 複数のフォーム実装
   - 共通コンポーネント化

以下の場合、カスタムフックの使用を検討：

1. **Progressive Enhancement重視**
   - JavaScript無効環境のサポートが必須
   - 基本的なフォーム機能のみ必要

2. **パフォーマンス重視**
   - バンドルサイズの最小化
   - 追加依存を避けたい

3. **カスタマイズ性重視**
   - 独自のバリデーションロジック
   - 特殊なフォーム挙動の実装

#### React Hook FormとServer Actionsの統合

##### 公式ドキュメントとの違い

Next.jsの公式ドキュメントでは、Server Actionsを以下のように直接フォームの`action`属性に設定する実装例が示されています：

```typescript
// 公式ドキュメントの例
export function Form() {
  const [state, formAction] = useFormState(serverAction, null);
  return (
    <form action={formAction}>
      <input name="field" />
      <button>送信</button>
    </form>
  );
}
```

しかし、React Hook Formを使用する場合は、以下の理由により直接`action={formAction}`を使用することができません：

1. **フォームデータの形式の違い**
   - Server Actions: ネイティブの`FormData`オブジェクトを期待
   - React Hook Form: 型付きのJavaScriptオブジェクトとしてデータを管理
   ```typescript
   // React Hook Formのデータ形式
   {
     userId: "example",
     email: "test@example.com"
   }
   
   // Server Actionsが期待するFormData形式
   FormData {
     "userId" => "example",
     "email" => "test@example.com"
   }
   ```

2. **バリデーションの実行タイミング**
   - Server Actions: フォーム送信時にのみバリデーション
   - React Hook Form: 
     - `onBlur`時のフィールドバリデーション
     - 送信前の全体バリデーション
     - カスタムバリデーションロジック

3. **型安全性の確保**
   - Server Actions: 型情報が限定的
   - React Hook Form: zodスキーマからの型推論が必要

##### 統合パターン

そのため、以下のような橋渡し実装が必要になります：

```typescript
export function RegisterForm() {
  const [serverState, formAction] = useFormState(registerAction, null);
  
  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur'
  });

  // Server ActionsとReact Hook Formを橋渡しする関数
  const onSubmit = async (data: FormData) => {
    const formData = new FormData();
    // React Hook FormのオブジェクトをFormDataに変換
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    // Server Actionを実行
    await formAction(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* フォームフィールド */}
    </form>
  );
}
```

##### 統合のメリット

この実装パターンにより、以下のメリットが得られます：

1. **型安全性の維持**
   - フォームデータの型チェック
   - バリデーションの型推論
   - コンパイル時のエラー検出

2. **両方のメリットを活用**
   - React Hook Formの豊富な機能
   - Server Actionsのプログレッシブエンハンスメント
   - クライアントとサーバーの両方でのバリデーション

3. **エラーハンドリングの統合**
   - クライアントエラーの即時表示
   - サーバーエラーの適切な処理
   - ユーザーへの明確なフィードバック

このように、公式ドキュメントには記載されていない実装パターンですが、React Hook FormとServer Actionsを組み合わせることで、より堅牢で使いやすいフォーム実装が可能になります。

### useMemoによるパフォーマンス最適化

#### 基本概念

`useMemo`は、Reactのパフォーマンス最適化のためのフックで、以下の機能を提供します：

1. **値のメモ化（キャッシュ）**
   - 計算コストの高い値の再計算を防止
   - オブジェクトや関数の再生成を回避
   - 依存配列に基づく選択的な再計算

2. **メモリ効率の向上**
   - 不要な再計算の防止
   - メモリ使用量の最適化
   - レンダリングパフォーマンスの改善

#### 実装例

##### 1. エラーメッセージコンポーネントのメモ化

```typescript
// メモ化なしの実装（非推奨）
const ErrorMessage = ({ error }: { error: { message?: string } }) => (
  <p className="mt-2 text-base text-red-500 font-medium">{error.message}</p>
);

// メモ化を使用した実装（推奨）
const ErrorMessage = useMemo(() => {
  return ({ error }: { error: { message?: string } }) => (
    <p className="mt-2 text-base text-red-500 font-medium">{error.message}</p>
  );
}, []); // 空の依存配列
```

##### 2. 計算コストの高い処理

```typescript
// 高コストな計算結果のメモ化
const calculatedValue = useMemo(() => {
  return expensiveCalculation(propA, propB);
}, [propA, propB]);

// 大きなオブジェクトの生成
const memoizedObject = useMemo(() => ({
  id: props.id,
  name: props.name,
  details: {
    // 複雑なオブジェクト構造
  }
}), [props.id, props.name]);
```

#### useMemoが有効なケース

1. **コンポーネントの最適化**
   - 複雑なJSX構造の生成
   - 子コンポーネントへの props の安定化
   ```typescript
   const MemoizedComponent = useMemo(() => (
     <ExpensiveComponent
       data={complexData}
       onAction={handleAction}
     />
   ), [complexData, handleAction]);
   ```

2. **計算コストの高い処理**
   - データの変換や加工
   - フィルタリングや集計
   ```typescript
   const filteredData = useMemo(() => {
     return rawData
       .filter(item => item.status === 'active')
       .map(item => transformItem(item))
       .sort((a, b) => b.priority - a.priority);
   }, [rawData]);
   ```

3. **オブジェクトや配列の安定化**
   - スタイルオブジェクト
   - コールバック関数の依存値
   ```typescript
   const styles = useMemo(() => ({
     container: {
       backgroundColor: theme.colors.background,
       padding: theme.spacing.medium,
     },
     text: {
       color: theme.colors.text,
       fontSize: theme.typography.size.medium,
     }
   }), [theme]);
   ```

#### 使用上の注意点

1. **適切な使用場面の判断**
   - シンプルな値や計算には不要
   - 実際のパフォーマンス問題がある場合に使用
   - 過度な最適化を避ける

2. **依存配列の管理**
   ```typescript
   // 良い例：必要な依存値のみを指定
   const value = useMemo(() => {
     return calculateValue(prop1, prop2);
   }, [prop1, prop2]);

   // 悪い例：不要な依存値を含める
   const value = useMemo(() => {
     return calculateValue(prop1);
   }, [prop1, prop2]); // prop2は不要
   ```

3. **パフォーマンスへの影響**
   - メモ化自体のオーバーヘッド
   - メモリ使用量とのトレードオフ
   - 適切なバランスの維持

#### ベストプラクティス

1. **使用を検討すべき状況**
   - 子コンポーネントの不要な再レンダリングを防ぐ
   - 計算コストの高い処理の結果をキャッシュ
   - 参照の安定性が必要な場合

2. **避けるべき状況**
   - プリミティブな値の計算
   - シンプルなJSX
   - 頻繁に変更される値

3. **コードの可読性とのバランス**
   ```typescript
   // 良い例：目的が明確
   const sortedItems = useMemo(() => {
     return items.sort((a, b) => b.priority - a.priority);
   }, [items]);

   // 悪い例：過度な最適化
   const text = useMemo(() => {
     return `Hello, ${name}!`;
   }, [name]); // 単純な文字列結合には不要
   ```

このように、`useMemo`は適切に使用することでアプリケーションのパフォーマンスを向上させることができますが、使用する場面を慎重に選択し、実際のパフォーマンス改善が見込める場合にのみ適用することが重要です。

## BFFのAPIクライアント実装

### 概要
BFFからWebAPIアプリケーションへの通信には、Web標準の`fetch` APIを使用し、タイムアウトとリトライ処理には`cockatiel`ライブラリを利用します。
HTTPメソッド別のラッパー関数を用意することで、型安全性と使いやすさを向上させています。

### タイムアウトとリトライ処理の実装（cockatiel）

```typescript
import { retry, handleAll, ExponentialBackoff, timeout, TimeoutStrategy, ConsecutiveBreaker, CircuitBreakerPolicy } from 'cockatiel';

// デフォルトの設定
const DEFAULT_CONFIG = {
  timeout: 10000,  // デフォルトタイムアウト: 10秒
  retry: {
    maxAttempts: 3,
    backoff: {
      initialDelay: 1000,  // 初回リトライまでの待機時間（ミリ秒）
      maxDelay: 5000      // 最大待機時間（ミリ秒）
    }
  }
} as const;

// サーキットブレーカーの設定型
type CircuitBreakerOptions = {
  threshold: number;        // 失敗回数の閾値
  duration: number;         // オープン状態の持続時間（ミリ秒）
  minimumThroughput?: number; // 最小スループット（オプション）
};

// APIクライアントのオプション拡張
type BffApiOptions = RequestInit & {
  timeoutMs?: number;
  circuitBreaker?: CircuitBreakerOptions;
};

// サーキットブレーカーのマップ（エンドポイントごとに保持）
const circuitBreakers = new Map<string, CircuitBreakerPolicy>();

// ポリシー作成関数の拡張
const createPolicies = (endpoint: string, options: BffApiOptions) => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONFIG.timeout;
  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Aggressive);
  const retryPolicy = retry(handleAll, {
    maxAttempts: DEFAULT_CONFIG.retry.maxAttempts,
    backoff: new ExponentialBackoff(DEFAULT_CONFIG.retry.backoff)
  });

  // サーキットブレーカーの取得または作成
  let circuitBreaker = circuitBreakers.get(endpoint);
  if (options.circuitBreaker && !circuitBreaker) {
    circuitBreaker = new ConsecutiveBreaker({
      threshold: options.circuitBreaker.threshold,
      duration: options.circuitBreaker.duration,
      minimumThroughput: options.circuitBreaker.minimumThroughput
    });
    circuitBreakers.set(endpoint, circuitBreaker);
  }

  return async (fn: () => Promise<any>) => {
    if (circuitBreaker) {
      return timeoutPolicy.execute(() => 
        circuitBreaker.execute(() => 
          retryPolicy.execute(fn)
        )
      );
    }
    return timeoutPolicy.execute(() => retryPolicy.execute(fn));
  };
};

// 使用例
const userApi = {
  getUser: (id: string) => get<User>(`/api/users/${id}`, {
    circuitBreaker: {
      threshold: 5,      // 5回連続失敗でオープン
      duration: 30000,   // 30秒間オープン状態を維持
      minimumThroughput: 3  // 最低3回の呼び出しを要求
    }
  }),
  
  // 重要な操作はより慎重な設定
  updateUserStatus: (id: string, status: UserStatus) => put<User>(`/api/users/${id}/status`, { status }, {
    circuitBreaker: {
      threshold: 3,      // 3回連続失敗でオープン
      duration: 60000,   // 1分間オープン状態を維持
    }
  })
};
```

### APIクライアントの基本構造

```typescript
const baseConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// 環境変数からAPIのベースURLを取得
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

// 共通のクライアント関数
async function bffApiClient<T>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs, ...fetchOptions } = options;
  const policy = createPolicies(endpoint, options);
  
  const url = `${API_BASE_URL}${endpoint}`;
  const mergedOptions = {
    ...baseConfig,
    ...fetchOptions,
    headers: {
      ...baseConfig.headers,
      ...fetchOptions.headers,
    },
  };

  // タイムアウトとリトライを含むフェッチの実行
  const response = await policy(async () => {
    const res = await fetch(url, mergedOptions);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(JSON.stringify({
        status: res.status,
        statusText: res.statusText,
        data: errorData,
      }));
    }
    return res;
  });

  // レスポンスがない場合（204 No Content）は空オブジェクトを返す
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
```

### HTTPメソッド別のラッパー関数
型安全性と使いやすさを向上させるため、各HTTPメソッド用のラッパー関数を提供します：

```typescript
// GETリクエスト
export function get<T>(endpoint: string, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'GET',
  });
}

// POSTリクエスト
export function post<T>(endpoint: string, data: unknown, options: RequestInit = {}) {
  return bffApiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 他のHTTPメソッド（PUT, DELETE, PATCH）も同様に実装
```

### オプションのマージ戦略
オプションは以下の優先順位で適用されます：

1. メソッド固有の設定（`method: 'GET'`など）
2. 呼び出し側から渡されたオプション（`options`）
3. ベース設定（`baseConfig`）

この階層的なオプションの結合により：
- デフォルト値の提供
- カスタムヘッダーの追加
- メソッド固有の設定の強制
- タイムアウト時間のカスタマイズ
が可能になります。

### 使用例

```typescript
// GETリクエスト（デフォルトのタイムアウト）
const user = await get<User>('/api/users/1');

// POSTリクエスト（カスタムタイムアウトとヘッダー）
const newUser = await post<User>('/api/users', userData, {
  timeoutMs: 5000,  // 5秒でタイムアウト
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## BFFからWebAPIへの通信実装

### アーキテクチャの概要

BFFからWebAPIへの通信実装は、以下のような構造で整理します：

```
/web-client
  /infrastructure
    webApiClient.ts   # WebAPIへのリクエストを行うクライアント
  bffApiClient.ts     # BFF層のAPIクライアント
  endpoints.ts        # エンドポイント定義
  types.ts           # 型定義
  index.ts          # エントリーポイント
```

### エンドポイントの定義（endpoints.ts）

```typescript
export const domains = {
  userApi: process.env.USER_API_DOMAIN ?? 'http://localhost:8081',
  examApi: process.env.EXAM_API_DOMAIN ?? 'http://localhost:8082',
  adminApi: process.env.ADMIN_API_DOMAIN ?? 'http://localhost:8083',
} as const;

// サーキットブレーカーの設定型
export type CircuitBreakerOptions = {
  threshold: number;
  duration: number;
  minimumThroughput?: number;
};

// リトライの設定型
export type RetryOptions = {
  maxAttempts: number;
  backoff: {
    initialDelay: number;
    maxDelay: number;
  };
};

// エンドポイントの設定例
const endpointConfigs = {
  user: {
    domain: 'userApi' as const,
    defaultTimeout: 5000,
    circuitBreaker: {
      threshold: 5,
      duration: 30000,
      minimumThroughput: 3
    },
    retry: {
      maxAttempts: 3,
      backoff: {
        initialDelay: 1000,
        maxDelay: 5000
      }
    },
    endpoints: {
      getUser: {
        path: '/users/:id',
      },
      createUser: {
        path: '/users',
        timeout: 10000,
      },
    },
  },
  // ... 他のドメイン
};
```

### APIクライアントの実装（bffApiClient.ts）

```typescript
export type ApiClient = {
  [E in ApiEndpointKey]: HttpMethods<unknown>;
};

export function createBffApiClient(implementation: IApiClient): ApiClient {
  return new Proxy({} as ApiClient, {
    get(target, endpointKey: ApiEndpointKey) {
      return {
        get: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
          implementation.request<R>(endpointKey, 'GET', params, undefined, options),

        post: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) =>
          implementation.request<R>(endpointKey, 'POST', params, data, options),

        // ... 他のHTTPメソッド
      };
    },
  });
}
```

### WebAPIクライアントの実装（infrastructure/webApiClient.ts）

```typescript
export class WebApiClient implements IApiClient {
  async request<R>(
    endpointKey: ApiEndpointKey,
    method: string,
    params: CommonParams = {},
    data?: unknown,
    options: CommonOptions = {}
  ): Promise<R> {
    const policy = createPolicies(endpointKey);
    const url = getEndpointUrl(endpointKey, params);
    // ... 実装の詳細
  }
}
```

### 使用例

```typescript
// APIクライアントのインスタンス作成
const api = createBffApiClient(new WebApiClient());

// 使用例
const user = await api.getUser.get<User>({ id: '123' });
const exams = await api.getExams.get<Exam[]>();
const result = await api.submitExam.post<ExamResult>(data, { id: examId });
```

### 設計上の利点

1. **エンドポイント管理の容易さ**
   - `endpoints.ts`の修正のみでエンドポイントの追加が可能
   - 設定の一元管理

2. **型安全性**
   - TypeScriptの型システムによる安全性確保
   - コンパイル時のエラー検出

3. **インフラストラクチャの隠蔽**
   - 実装詳細をBffApiClientに閉じ込め
   - クリーンなインターフェース提供

4. **テスト容易性**
   - モック化が容易
   - インターフェースベースの設計

5. **エラーハンドリング**
   - サーキットブレーカーによる障害対策
   - リトライ処理による回復性
   - タイムアウト制御

6. **拡張性**
   - 新しいHTTPメソッドの追加が容易
   - ミドルウェアパターンの適用が可能

### createApiClientの詳細解説

`createApiClient`関数は、JavaScriptのProxyオブジェクトを使用して、動的なAPIクライアントを生成します。この実装の詳細を見ていきましょう。

#### Proxyオブジェクトの基本

```typescript
export function createApiClient(implementation: IApiClient): ApiClient {
  return new Proxy({} as ApiClient, {
    get(target, endpointKey: ApiEndpointKey) {
      // ...
    }
  });
}
```

1. **Proxyとは**
   - JavaScriptのビルトイン機能
   - オブジェクトの基本操作（プロパティの取得、設定など）をカスタマイズ可能
   - 動的なプロパティアクセスを実現

2. **引数の説明**
   - `target`: Proxyのターゲットオブジェクト（今回は空オブジェクト）
   - `endpointKey`: アクセスされたプロパティ名（例：`'getUser'`）
   - `implementation`: 実際のAPI呼び出しを行うクライアントの実装

#### 動的なメソッドチェーンの仕組み

```typescript
// 使用例
const user = await api.getUser.get<User>({ id: '123' });
```

この呼び出しの内部動作：

1. `api.getUser`にアクセス
   ```typescript
   get(target, endpointKey: ApiEndpointKey) {
     // endpointKey = 'getUser'
     return {
       get: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) => // ...
       post: <R>(data: unknown, params?: CommonParams, options?: CommonOptions) => // ...
     };
   }
   ```
   - Proxyの`get`トラップが呼び出される
   - `endpointKey`に`'getUser'`が設定される
   - HTTPメソッド（get, post等）を持つオブジェクトを返す

2. `.get()`メソッドの呼び出し
   ```typescript
   get: <R>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) =>
     implementation.request<R>(endpointKey, 'GET', params, undefined, options)
   ```
   - 返されたオブジェクトの`get`メソッドが実行される
   - `implementation.request`を呼び出し、実際のリクエストを実行

#### 型システムとの連携

```typescript
export type ApiClient = {
  [E in ApiEndpointKey]: HttpMethods<unknown>;
};

type HttpMethods<T> = {
  get: <R = T>(params?: CommonParams, options?: Omit<RequestInit, 'method'>) => Promise<R>;
  post: <R = T>(data: unknown, params?: CommonParams, options?: CommonOptions) => Promise<R>;
  // ... 他のHTTPメソッド
};
```

1. **型の役割**
   - `ApiClient`: エンドポイントとHTTPメソッドの対応を定義
   - `HttpMethods`: 各エンドポイントで利用可能なメソッドを定義
   - ジェネリック型による戻り値の型指定

2. **型安全性の確保**
   - 存在しないエンドポイントへのアクセスをコンパイル時に検出
   - メソッドの引数の型チェック
   - レスポンスの型推論

#### 実装のメリット

1. **使いやすさ**
   ```typescript
   // 直感的なAPI呼び出し
   const user = await api.getUser.get<User>({ id: '123' });
   const result = await api.submitExam.post<ExamResult>(data, { id: examId });
   ```

2. **型安全性**
   ```typescript
   // コンパイルエラーになる例
   const invalid = await api.nonExistentEndpoint.get(); // エンドポイントが存在しない
   const wrongType = await api.getUser.get<number>(); // 型が不一致
   ```

3. **拡張性**
   ```typescript
   // 新しいHTTPメソッドの追加が容易
   type HttpMethods<T> = {
     // 既存のメソッド
     get: <R = T>(params?: CommonParams) => Promise<R>;
     post: <R = T>(data: unknown, params?: CommonParams) => Promise<R>;
     // 新しいメソッド
     patch: <R = T>(data: unknown, params?: CommonParams) => Promise<R>;
   };
   ```

4. **実装の分離**
   - インターフェース（`IApiClient`）による実装の抽象化
   - テスト時のモック化が容易
   - 異なる実装への切り替えが可能

このように、`createApiClient`は、型安全で使いやすいAPIクライアントを実現する重要な役割を果たしています。Proxyを使用することで、エンドポイントの追加や変更に柔軟に対応できる設計となっています。

### エンドポイントオブジェクトの構造と生成

`endpoints.ts`で定義されたエンドポイントは、以下のような処理で平坦化され、使いやすい形に変換されます：

```typescript
// エンドポイントの設定を平坦化する処理
export const endpoints = Object.entries(endpointConfigs).reduce((acc, [_, domainConfig]) => {
  const endpoints = Object.entries(domainConfig.endpoints).reduce((endpointAcc, [key, endpoint]) => {
    return {
      ...endpointAcc,
      [key]: {
        domain: domainConfig.domain,
        path: endpoint.path,
        timeout: endpoint.timeout ?? domainConfig.defaultTimeout,
        circuitBreaker: domainConfig.circuitBreaker,
        retry: (endpoint as any).retry ?? domainConfig.retry,
      },
    };
  }, {});
  return { ...acc, ...endpoints };
}, {}) as Record<string, EndpointInternalConfig>;
```

#### 変換前後の構造

1. **変換前（入力）**：階層的な構造
```typescript
const endpointConfigs = {
  user: {  // ドメイン
    domain: 'userApi',
    defaultTimeout: 5000,
    circuitBreaker: { /* ... */ },
    retry: { /* ... */ },
    endpoints: {
      getUser: { path: '/users/:id' },
      createUser: { 
        path: '/users',
        timeout: 10000
      }
    }
  },
  exam: {  // 別のドメイン
    // ... 同様の構造
  }
};
```

2. **変換後（出力）**：平坦化された構造
```typescript
const endpoints = {
  getUser: {
    domain: 'userApi',
    path: '/users/:id',
    timeout: 5000,  // defaultTimeoutから継承
    circuitBreaker: { /* ドメインの設定 */ },
    retry: { /* ドメインの設定 */ }
  },
  createUser: {
    domain: 'userApi',
    path: '/users',
    timeout: 10000,  // エンドポイント固有の設定
    circuitBreaker: { /* ドメインの設定 */ },
    retry: { /* ドメインの設定 */ }
  },
  // ... 他のエンドポイント
};
```

#### 設定の継承メカニズム

1. **デフォルト値の適用**
   - タイムアウト：エンドポイント固有の設定 → ドメインのデフォルト値
   - リトライ設定：エンドポイント固有の設定 → ドメインの設定
   - サーキットブレーカー：ドメインレベルで共有

2. **設定のマージ順序**
   ```typescript
   {
     // 1. ドメインの基本設定
     domain: domainConfig.domain,
     
     // 2. エンドポイントのパス
     path: endpoint.path,
     
     // 3. タイムアウト（エンドポイント固有またはデフォルト）
     timeout: endpoint.timeout ?? domainConfig.defaultTimeout,
     
     // 4. 共有設定
     circuitBreaker: domainConfig.circuitBreaker,
     retry: (endpoint as any).retry ?? domainConfig.retry,
   }
   ```

#### エンドポイントURLの解決

```typescript
export function getEndpointUrl(
  endpointKey: ApiEndpointKey,
  params: Record<string, string> = {}
): string {
  const endpoint = endpoints[endpointKey];
  let resolvedPath = endpoint.path;

  // パスパラメータの置換
  Object.entries(params).forEach(([key, value]) => {
    resolvedPath = resolvedPath.replace(`:${key}`, value);
  });

  // 完全なURLの生成
  return `${domains[endpoint.domain]}${resolvedPath}`;
}
```

#### 使用例

```typescript
// エンドポイントの定義
const endpoints = {
  getUser: {
    domain: 'userApi',
    path: '/users/:id',
    timeout: 5000
  }
};

// URLの解決
const url = getEndpointUrl('getUser', { id: '123' });
// 結果: 'http://localhost:8081/users/123'

// APIクライアントでの使用
const user = await api.getUser.get<User>({ id: '123' });
```

このように、エンドポイントの定義は階層的な構造から平坦な構造に変換され、それぞれのエンドポイントに必要な設定が適切に継承されます。この構造により：

1. **設定の一元管理**
   - ドメインレベルでのデフォルト値の設定
   - 共通設定の効率的な管理

2. **柔軟なカスタマイズ**
   - エンドポイントごとの設定上書き
   - 必要に応じた細かな制御

3. **使いやすさ**
   - シンプルな形式でのエンドポイント参照
   - 直感的なURL解決

4. **保守性**
   - 設定変更の影響範囲が明確
   - コードの見通しの良さ

## Middleware による認証制御

### 1. Middlewareの基本

Next.jsのMiddlewareは、リクエストの処理前に実行される特別なコードです。プロジェクトのルートディレクトリに`middleware.ts`を配置することで、自動的に有効になります。

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 認証が不要なパス
const publicPaths = ['/', '/login', '/register'];

// パスが公開パスかどうかをチェック
const isPublicPath = (path: string) => {
  return publicPaths.some(publicPath => 
    path === publicPath || path === `${publicPath}/`
  );
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 認証が不要なパスの場合はスキップ
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  // JWTの取得を試みる
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // 認証が必要なパスで未認証の場合、ログインページにリダイレクト
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    // 現在のパスを?callbackUrl=としてクエリに追加
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ミドルウェアを適用するパスを設定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

### 2. エッジランタイムでの実行

Middlewareはエッジランタイム（Edge Runtime）で実行されます。これには以下のような特徴と制限があります：

1. **実行環境の制限**
   - Node.jsのAPIが使用できない
   - 利用可能なWeb APIが限定される
   - ファイルシステムへのアクセス不可

2. **高速な実行**
   - ユーザーに近いエッジで実行
   - レイテンシの最小化
   - CDNとの親和性

3. **軽量な処理**
   - 単純なルーティング制御
   - ヘッダーの確認や設定
   - 基本的な認証チェック

### 3. セキュリティの考慮事項

1. **二重の認証チェック**
   ```typescript
   // Middleware（エッジ）での軽量なチェック
   export async function middleware(request: NextRequest) {
     const token = await getToken({ req: request });
     if (!token) return NextResponse.redirect(new URL('/login', request.url));
     return NextResponse.next();
   }

   // APIルート（アプリケーションサーバー）での厳密なチェック
   export async function GET(request: Request) {
     const session = await getServerSession(authOptions);
     if (!session) {
       return new Response('Unauthorized', { status: 401 });
     }
     
     // トークンの有効性を詳細にチェック
     const isValid = await validateToken(session.user.id);
     if (!isValid) {
       return new Response('Invalid token', { status: 401 });
     }

     // 本来の処理
     return new Response('Success', { status: 200 });
   }
   ```

2. **認証の役割分担**
   - Middleware: ルーティングレベルの基本的な認証チェック
   - アプリケーションサーバー: 詳細な認証・認可の検証

3. **セキュリティのベストプラクティス**
   - JWTの署名検証は必須
   - センシティブな処理はアプリケーションサーバーで実行
   - エッジでの処理は最小限に抑える

### 4. パフォーマンスの最適化

1. **静的アセットの除外**
   ```typescript
   export const config = {
     matcher: [
       // 静的ファイルは除外
       '/((?!_next/static|_next/image|favicon.ico|public).*)',
     ],
   };
   ```

2. **キャッシュの活用**
   ```typescript
   // レスポンスヘッダーの設定
   const response = NextResponse.next();
   response.headers.set('Cache-Control', 's-maxage=60');
   return response;
   ```

3. **効率的なルーティング**
   ```typescript
   // パスパターンの最適化
   const matcher = [
     '/dashboard/:path*',
     '/api/:path*',
     '/((?!auth|_next|static).*)'
   ];
   ```

### 5. 実装のベストプラクティス

1. **明確な責務分担**
   - Middleware: ルーティング制御、基本的な認証チェック
   - アプリケーション: ビジネスロジック、詳細な認証・認可

2. **エラーハンドリング**
   ```typescript
   export async function middleware(request: NextRequest) {
     try {
       const token = await getToken({ req: request });
       // ... 処理 ...
     } catch (error) {
       // エラー時は安全側に倒してログインページへ
       console.error('Middleware error:', error);
       return NextResponse.redirect(new URL('/login', request.url));
     }
   }
   ```

3. **環境変数の利用**
   ```typescript
   const token = await getToken({
     req: request,
     secret: process.env.NEXTAUTH_SECRET
   });
   ```

このように、Middlewareはエッジでの高速な認証チェックを提供しますが、その制限を理解し、適切な役割分担を行うことが重要です。セキュリティ上重要な処理は必ずアプリケーションサーバー側で実行し、Middlewareはルーティングレベルの基本的なチェックに留めるべきです。

## MSW（Mock Service Worker）によるAPIモック

### 1. 基本設定

MSWは、APIリクエストをインターセプトしてモックレスポンスを返すためのライブラリです。開発環境でのバックエンドAPIのモックに使用します。

#### ファイル構造
```
/mocks
  /handlers.ts  # モックの定義
  /server.ts    # サーバーインスタンスのエクスポート
  /browser.ts   # ブラウザ環境でのワーカー設定
  /node.ts      # 開発環境でのサーバー起動
```

### 2. 初期化処理

`app/layout.tsx`で環境に応じたMSWの初期化を行います：

```typescript
/**
 * MSWの初期化
 * 
 * 主な責務：
 * - 環境（サーバーサイド/クライアントサイド）に応じたMSWの初期化
 * - 開発環境でのみMSWを起動
 * 
 * 初期化の流れ：
 * 1. サーバーサイド（SSR）の場合：
 *    - server.tsのサーバーインスタンスをインポート
 *    - サーバーサイドでのAPIモックを有効化
 * 
 * 2. クライアントサイドの場合：
 *    - browser.tsのワーカーをインポート
 *    - ブラウザ環境でのAPIモックを有効化
 * 
 * 環境判定の仕組み：
 * - typeof window === 'undefined'
 *   - true: サーバーサイド（windowオブジェクトが存在しない）
 *   - false: クライアントサイド（windowオブジェクトが存在する）
 * 
 * 注意：
 * - 開発環境でのみ初期化を実行
 * - 本アプリケーションではBFFを経由するため、
 *   クライアントサイドのモックは実際には使用されない
 */
const initMocks = async () => {
  if (typeof window === 'undefined') {
    const { server } = await import('@/mocks/server');
    server.listen();
  } else {
    const { worker } = await import('@/mocks/browser');
    worker.start();
  }
};

if (process.env.NODE_ENV === 'development') {
  initMocks();
}
```

### 3. サーバーサイドの設定

`server.ts`はサーバーインスタンスの定義とエクスポートを担当します：

```typescript
/**
 * MSWサーバーインスタンスの定義とエクスポート
 * 
 * 責務：
 * - サーバーインスタンスの定義
 * - ハンドラーの適用
 * - サーバーインスタンスのエクスポート
 * 
 * 注意：
 * - サーバーインスタンスの定義はこのファイルの責務
 * - サーバーの起動はapp/layout.tsxで行う
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 4. ブラウザ環境の設定

`browser.ts`はブラウザ環境でのワーカー設定を担当します：

```typescript
/**
 * MSWワーカーの設定
 * 
 * 責務：
 * - ブラウザ環境でのMSWワーカーの設定
 * - ハンドラーの適用
 * 
 * 注意：
 * - 本アプリケーションではBFFを経由するため、
 *   ブラウザ環境でのモックは実際には使用されない
 * - 開発環境でのみ自動的に起動する
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 5. ハンドラーの定義

`handlers.ts`でAPIエンドポイントごとのモックレスポンスを定義します：

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GETリクエストのモック
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Mock User',
      // ... その他のユーザー情報
    });
  }),

  // POSTリクエストのモック
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'new-user-id',
      ...body,
    });
  }),

  // その他のエンドポイントのモック
];
```

### 6. 未処理リクエストの設定

開発環境では、モックが定義されていないリクエストを実際のサーバーに転送する設定が可能です：

```typescript
// server.listenのオプション
server.listen({
  onUnhandledRequest: 'bypass'  // 未処理のリクエストを実際のサーバーに転送
});
```

オプション：
- `'bypass'`: 未処理リクエストを実際のサーバーに転送（開発環境向け）
- `'error'`: 未処理リクエストをエラーとして扱う（テスト環境向け）
- `'warn'`: 未処理リクエストに対して警告を出す（開発環境向け）

### 7. アーキテクチャ上の注意点

1. **BFFアーキテクチャとの関係**
   - クライアント→BFFの通信はモックしない
   - BFF→バックエンドの通信のみをモック
   - ブラウザ環境でのモックは実質的に使用されない

2. **環境による動作の違い**
   - 開発環境：MSWが有効
   - 本番環境：MSWは無効化
   - テスト環境：必要に応じて有効化

3. **セキュリティ考慮事項**
   - モックデータに機密情報を含めない
   - 本番環境では必ず無効化
   - テストデータは適切に管理

このように、MSWを使用することで、開発環境でのバックエンドAPIのモックを効率的に行うことができます。特にBFFアーキテクチャでは、サーバーサイドでのモックが重要となり、クライアントサイドのモックは実質的に使用されない設計となっています。