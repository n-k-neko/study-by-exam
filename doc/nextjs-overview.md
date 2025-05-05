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
import { retry, handleAll, ExponentialBackoff, timeout, TimeoutStrategy } from 'cockatiel';

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

// リトライポリシーとタイムアウトポリシーの設定
const createPolicies = (timeoutMs: number = DEFAULT_CONFIG.timeout) => {
  const timeoutPolicy = timeout(timeoutMs, TimeoutStrategy.Aggressive);
  const retryPolicy = retry(handleAll, {
    maxAttempts: DEFAULT_CONFIG.retry.maxAttempts,
    backoff: new ExponentialBackoff(DEFAULT_CONFIG.retry.backoff)
  });

  return async (fn: () => Promise<any>) => {
    return timeoutPolicy.execute(() => retryPolicy.execute(fn));
  };
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
  const policy = createPolicies(timeoutMs);
  
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
