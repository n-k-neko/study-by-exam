# Next.js × AIチャットアプリにおける状態管理とRedux使用要否まとめ

## 現在の構成

- フレームワーク: Next.js（App Router）
- 認証方式: auth.js（JWT）
- ログイン画面・チャット画面・チャット一覧画面あり
- チャット機能は fetch による一括取得でストリーミング未対応
- ユーザー情報やロールは JWT に含まれており、クライアント側でも取得可能

---

## 状態管理の考え方

### ログイン状態・ユーザー情報

- `auth()`（サーバー）を使えば取得可能
- ロールも `session.user.role` などから判定可能
- → **グローバル状態管理（Redux等）は不要**

### チャット状態管理（useReducer活用）
- 画面内で完結しており、`useReducer` で管理するのがシンプルで拡張性も高い

#### useReducerについて
`useReducer` は、複数の状態が密接に関連し、状態遷移が複雑な場合に有効なReactのフックです。状態管理のロジックをreducer関数として分離できるため、状態遷移が明確になり、テストや保守性も高まります。

##### useStateとの使い分け
| フック         | 向いているケース                                         | 特徴・備考                           |
|----------------|--------------------------------------------------------|--------------------------------------|
| useState       | 単純な値・配列・オブジェクトの状態管理                  | 直感的・シンプル                     |
| useReducer     | 複数の状態が密接に関連し、状態遷移が複雑な場合         | reducer関数で状態遷移を明示的に管理  |

**例:**  
- 入力フォームの値や単一のフラグ管理 → `useState`  
- チャットのように「送信」「受信」「エラー」など複数の状態遷移がある場合 → `useReducer`

```typescript
// hooks/useChat.ts
import { useReducer } from 'react';

// チャットメッセージの型定義
// role: 発言者（user/assistant）、content: メッセージ内容
// Message型の配列で履歴を管理
// isLoading: API応答待ちかどうか、error: エラー内容
// ChatState型でチャット全体の状態を表現

type Message = { role: 'user' | 'assistant'; content: string };
type ChatState = { messages: Message[]; isLoading: boolean; error: string | null };

// payload: アクションが運ぶデータ。ここではメッセージ内容やエラー内容などを格納する。ReduxやuseReducerの文脈で非常によく使われる一般的な命名。
type Action =
  // ユーザーが送信したとき
  | { type: 'SEND'; payload: string }
  // AIから応答を受信したとき
  | { type: 'RECEIVE'; payload: string }
  // エラー発生時
  | { type: 'ERROR'; payload: string }
  // ローディング状態の切り替え
  | { type: 'LOADING'; payload: boolean };

// 初期状態（メッセージ空、ローディング・エラーなし）
const initialState: ChatState = { messages: [], isLoading: false, error: null };

// 状態遷移を管理するreducer関数
// state: 現在の状態, action: 発生したアクション
function chatReducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'SEND':
      // ユーザーの発言をmessagesに追加し、ローディング開始
      return {
        ...state,
        messages: [...state.messages, { role: 'user', content: action.payload }], // 既存のmessages配列の末尾に新しいメッセージを追加
        isLoading: true,
        error: null,
      };
    case 'RECEIVE':
      // AIの応答をmessagesに追加し、ローディング終了
      return {
        ...state,
        messages: [...state.messages, { role: 'assistant', content: action.payload }],
        isLoading: false,
      };
    case 'ERROR':
      // エラー発生時はエラーメッセージをセットしローディング終了
      return { ...state, error: action.payload, isLoading: false };
    case 'LOADING':
      // ローディング状態の切り替え
      return { ...state, isLoading: action.payload };
    default:
      // 想定外のアクションは現状維持
      return state;
  }
}

// useChatカスタムフック
// useReducerで状態とdispatch関数を取得
export function useChat() {
  // useReducerの返り値は [state, dispatch] の配列。
  // state: 現在の状態（messages, isLoading, errorなどのオブジェクト）
  // dispatch: アクション（{ type, payload }など）をreducerに送る関数
  // useReducerの第1引数: 状態遷移を管理するreducer関数（ここではchatReducer）
  // useReducerの第2引数: 状態の初期値（ここではinitialState）
  const [state, dispatch] = useReducer(chatReducer, initialState); 

  // メッセージ送信処理
  const sendMessage = async (input: string) => {
    // まずdispatchで画面上の状態（ユーザーの発言追加・ローディング開始）を即時に反映
    dispatch({ type: 'SEND', payload: input }); // 送信アクション

    try {
      // その後、実際にAPIリクエストを投げてAIの応答を取得
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (!res.ok) throw new Error('AI APIエラー');

      const data = await res.json();
      dispatch({ type: 'RECEIVE', payload: data.response }); // 受信アクション
    } catch (err: any) {
      dispatch({ type: 'ERROR', payload: err.message }); // エラーアクション
    }
  };

  // state（messages, isLoading, error）とsendMessageを返す
  return { ...state, sendMessage };
}
```

#### チャットページでの使用例
```typescript
// app/chat/page.tsx
'use client';
import { useChat } from '@/hooks/useChat';
import { useState } from 'react';

export default function ChatPage() {
  const { messages, sendMessage, isLoading, error } = useChat();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.role === 'user' ? 'あなた' : 'AI'}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} />
        <button type="submit" disabled={isLoading || !input.trim()}>
          送信
        </button>
      </form>

      {isLoading && <p>応答中...</p>}
      {error && <p style={{ color: 'red' }}>エラー: {error}</p>}
    </div>
  );
}
```

## Reduxが不要な理由

| 状況             | 内容                                                             | Redux必要？ |
|------------------|------------------------------------------------------------------|-------------|
| ログイン状態     | `auth.js` + JWT によりログイン状態はセッションから取得可能      | ❌          |
| ユーザー情報取得 | `session.user` からIDやロールなどの情報を直接取得可能           | ❌          |
| チャット状態     | `useReducer` または `useState` によりローカルで管理可能         | ❌          |
| グローバル共有   | 今のところ必要なし（画面間で共有すべき情報が少ない）            | ❌          |
| 非同期処理管理   | 通常の `fetch` による処理で十分。状態遷移はHook内で完結可能     | ❌          |
| UI制御の複雑性   | ページごとに状態が閉じており、Reduxで一元管理する必要性が低い    | ❌          |


## Redux が必要になる可能性のある将来条件

| 状況                           | 内容                                                                 |
|--------------------------------|----------------------------------------------------------------------|
| 状態のグローバル共有が必要     | 複数のページやコンポーネント間でチャット履歴やユーザー設定を共有したい場合 |
| 通知やリアルタイム情報の管理   | WebSocket やポーリングによる通知機能をアプリ全体で扱いたい場合       |
| 状態の履歴管理・デバッグ強化   | Undo/Redo機能、Redux DevToolsを用いた状態の追跡が必要な場合         |
| 大規模なフォームや設定画面     | 入力中の状態やバリデーション状態を複数画面・コンポーネントで扱う場合 |
| 非同期通信の状態を一元管理したい | API通信の success/failure/loading を画面横断で管理したい場合        |
| テーマ・言語切替の全体適用     | ダークモード・多言語切替などをグローバルに扱う場合                   |
| 状態が肥大化し `useReducer` では限界 | 状態が多くなり reducer での管理が煩雑になるケース                     |

---

## useReducer と Redux の比較

| 項目         | useReducer                                 | Redux（+ React-Redux）                |
|--------------|--------------------------------------------|---------------------------------------|
| スコープ     | コンポーネント単位（ローカル）             | アプリ全体（グローバル）              |
| 記述量       | 少なめ                                     | 多め（ストア・アクション等が必要）    |
| デバッグ     | シンプル                                   | Redux DevTools など強力な追跡が可能   |
| 拡張性       | 状態が増えると reducer が複雑になりやすい  | 大規模でも一元管理しやすい            |
| 主な用途     | 画面内で閉じた状態管理                     | 複数画面・複数コンポーネントで共有    |

**まとめ:**  
- 画面内で完結する状態管理は `useReducer` で十分  
- アプリ全体で状態を共有・追跡したい場合は Redux を検討

// payload: アクションが運ぶデータ。ここではメッセージ内容やエラー内容などを格納する。ReduxやuseReducerの文脈で非常によく使われる一般的な命名。