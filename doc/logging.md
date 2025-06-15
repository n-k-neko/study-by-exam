# Next.jsのロギングライブラリ選定（BFF用途）

## 概要
Next.js（BFF）プロジェクトで利用するロギングライブラリについて、選定観点を整理し、最終的に**pino**を推奨する理由と実践的な比較・注意点をまとめる。

---

## 選定の観点（BFFとして求められる要件）
- **軽量・高速**：BFFはAPIゲートウェイやLambda等で動作することも多く、レスポンス性能・起動速度が重要
- **構造化ログ**：CloudWatchやDatadog等での検索・集計・可視化を前提とする
- **メンテナンス性・拡張性**：アクティブな開発・大きなコミュニティ・必要十分な機能
- **出力先の柔軟性**：本番・開発・監視連携など多様な出力先に対応できること

---

## ロギングライブラリ比較（console.log含む）

Node.jsエコシステムでは**pino**と**winston**が2大主流です。どちらも多くのプロジェクトで採用されており、npmダウンロード数やGitHubスター数でも他のライブラリを大きく上回っています（2025年5月時点）。

| 項目 | console.log | pino | winston |
|------|-------------|------|---------|
| 設計思想 | Node.js標準・簡易 | 高速・構造化ログ特化 | 多機能・整形自由 |
| 出力形式 | テキストのみ | JSON（+pino-prettyでテキスト） | テキスト／JSON 両対応 |
| ログレベル制御 | 不可 | 可能 | 可能 |
| 構造化ログ | 不可 | 可能 | 可能 |
| 出力先制御 | 不可 | 柔軟 | 柔軟 |
| パフォーマンス | 重い | **非常に高速（winston比で10倍以上）** | やや重め |
| スタックトレース | 手動 | 自動 | 柔軟 |
| 週あたりDL数（※2025年5月時点） | - | 約11,000,000回 | 約13,500,000回 |
| 傾向 | - | 急成長中 | 横ばい／緩やかに下降傾向 |

※ npmダウンロード数出典: [https://npmtrends.com/pino-vs-winston](https://npmtrends.com/pino-vs-winston)

> **Note:**
> pinoは標準でJSON形式のみ対応ですが、開発時など人間が読みやすいテキスト出力をしたい場合は公式の`pino-pretty`パッケージを組み合わせて利用できます。
> 本番運用やCloudWatch連携ではJSON出力が基本となります。

---

### console.logが本番で不採用な理由
- ログレベル管理不可
- 構造化されていない（監視・可視化に不向き）
- 出力先の制御不可（標準出力のみ）
- パフォーマンスへの影響が大きい
- スタックトレースやアラート連携が困難

---

### 選定理由と推奨ライブラリ

BFF用途では、上記の選定観点（軽量・高速・構造化ログ・運用のしやすさ等）を最もバランス良く満たすため、**pinoを推奨**します。

---

## 補足：運用上の注意点

- **pino-pretty**は開発用。運用環境ではJSON出力をCloudWatch等に連携するのが前提。
- **ログ出力の粒度・タイミング**は設計ガイド（logging-design.md）も参照。

---

## pinoの基本設定・使用例

以下は、Next.js BFF用途でのpinoの最小構成例と、よく使う設定・出力例です。

```ts
// lib/logger.ts
import pino from 'pino';

const logger = pino({
  // level: 'info' なら info/warn/error のみ出力、'debug' なら全て出力
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});

export default logger;
```

### level設定による挙動
- `level`で指定したレベル以上のログのみ出力されます。
  - 例: `level: 'info'` → info/warn/errorのみ出力、debugは出力されない
  - 例: `level: 'debug'` → debug/info/warn/errorすべて出力
- 本番は`info`以上、開発は`debug`推奨

### 出力先の設定例
- デフォルトは標準出力（console）
- **AWS LambdaやECS/Fargate等の本番環境では、標準出力（console）にJSON形式で出力すれば自動的にCloudWatch Logsへ転送されるため、特別な設定は不要です。**
- ファイル出力したい場合:
```ts
const logger = pino(pino.destination('./logs/app.log'));
```
- 複数出力先や外部サービス連携はpinoの公式ドキュメント参照

### スタックトレースを含める方法
- `logger.error(new Error('エラー内容'))` のようにErrorオブジェクトを渡すと、
  自動的に`stack`プロパティがJSONログに含まれます。
- 例：
```ts
try {
  // ...処理...
} catch (err) {
  logger.error(err, '処理中に例外発生');
}
```
- info/warn/debugでもErrorオブジェクトを渡せばstackが出力されます

### pinoの主な設定項目とデフォルト値
- `level`: ログレベル（デフォルト: 'info'）
- `transport`: 出力整形や外部連携用（デフォルト: undefined／標準出力にJSON）
- `base`: すべてのログに共通で付与するフィールド（デフォルト: { pid, hostname }）
- `timestamp`: タイムスタンプの出力形式（デフォルト: ISO8601の文字列）
- `formatters`: ログ出力のカスタマイズ（デフォルト: ほぼそのままJSON出力）
- `redact`: 機密情報のマスキング（デフォルト: 無効）
- `mixin`: ログごとに動的なフィールドを追加（デフォルト: なし）
- `serializers`: オブジェクトの出力方法をカスタマイズ（デフォルト: なし）
- `hooks`: ログ出力前後のフック処理（デフォルト: なし）

#### 何も設定しない場合の挙動
- ログレベルは`info`以上のみ出力
- 出力先は標準出力（console）にJSON形式
- 各ログに`pid`と`hostname`が自動で付与
- タイムスタンプはISO8601文字列
- ログ構造はシンプルなJSON（追加整形なし）
- マスキングやカスタムシリアライザ等は無効

> 詳細は公式ドキュメント（https://getpino.io/#/） を参照

### 利用例（APIハンドラやサーバーサイド関数内など）
```ts
import logger from '@/lib/logger';

export async function handler(req, res) {
  logger.info({ userId: req.user?.id }, 'ユーザー情報取得開始');
  // ...処理...
  try {
    // ...
  } catch (err) {
    logger.error(err, 'エラー発生');
  }
}
```

- 本番環境ではJSON出力、開発環境ではpino-prettyで可読性を向上
- CloudWatch等の監視基盤ではJSONログをそのまま活用
- logger.info/debug/error/warn などでレベル分けが可能

---
