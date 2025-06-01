# Next.jsにおける帳票処理設計まとめ

## 概要

Next.jsをBFF（Backend for Frontend）として利用する場合、帳票（PDF, Excel, CSV等）の出力・ダウンロードは通常のJSON APIとは異なる処理が必要となる。本ドキュメントでは、帳票処理の適切な実装方法について整理する。

---

## 帳票処理の全体構成

1. **バックエンド（例：Spring Boot）**  
   帳票ファイル（PDF, Excelなど）を生成し、`Content-Type` と `Content-Disposition` を適切に設定してバイナリデータとして返す。

2. **Next.jsのBFF（APIルート）**  
   `/api/report`などのエンドポイントを設け、バックエンドからの帳票レスポンスを**バイナリのまま中継**する。

3. **クライアント**  
   BFF経由で帳票を取得し、**Blob**を使ってユーザーに**ダウンロードまたはブラウザ表示**させる。

---

## 処理フロー図
```
[Client]
↓ fetch or <a>
[BFF: /api/report]
↓ fetch
[Backend API: /reports/daily]
→ [PDF Binary Response]
↑
[BFF returns PDF]
↑
[Client downloads or displays]
```

---

## Server Actionsが不適な理由

| 理由 | 内容 |
|------|------|
| バイナリ非対応 | Server ActionはJSONやプリミティブ型のみ返却可能 |
| Content-Type非制御 | `application/pdf` や `Content-Disposition` を返せない |
| ダウンロード不可 | BlobやObject URLを使ったダウンロード処理が必要なため |

---

## 推奨実装（Next.js App Router）

### `/app/api/report/route.ts`

```ts
import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('http://backend-api/reports/daily');
  const buffer = await res.arrayBuffer(); // fetchが返すのは Response オブジェクトであり、.arrayBuffer() はそれを「生のバイナリ」に変換するために使われる
  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';

  return new NextResponse(buffer, {
    status: res.status,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'attachment; filename="report.pdf"',
    },
  });
}
```

### クライアント側：Blobを使ってダウンロード
```ts
const downloadReport = async () => {
  const res = await fetch('/api/report');　// 帳票バイナリを取得
  const blob = await res.blob();　// Blob化
  const url = URL.createObjectURL(blob);　// 一時URLを作成
  const a = document.createElement('a');
  a.href = url;
  a.download = 'report.pdf';
  a.click();　// ダウンロードを実行
  URL.revokeObjectURL(url);　 // 一時URLを破棄
};
```
## Blobとは？

### 📌 定義

`Blob`（Binary Large Object）は、JavaScriptにおける**バイナリデータ（画像、PDF、音声、動画など）を扱うためのオブジェクト**。

ブラウザ上でファイルのようなデータを一時的に扱ったり、ダウンロードさせたり、表示させたりする用途で使われる。

---

### 主な用途

| 用途 | 説明 |
|------|------|
| PDF・Excelのダウンロード | バックエンドから取得したバイナリをBlobとして扱い、URLを生成してダウンロード |
| ファイルのプレビュー表示 | 画像・PDFなどを`<img>`や`<iframe>`に表示可能 |
| 音声・動画の再生 | `<audio>`や`<video>`にBlob URLを渡すことでブラウザで再生できる |

---

### Blobと他のバイナリ処理APIの違い

| API名         | 主な用途                     | 備考 |
|---------------|------------------------------|------|
| `Blob`        | ブラウザでファイルを扱うため | 表示・ダウンロード向け。ファイル名などの属性なし |
| `File`        | ファイル**入力**のデータを扱う   | `Blob`の拡張。ファイル名・タイプ・更新日などの属性あり |
| `ArrayBuffer` | バイナリを低レベルで扱う     | バイト単位で操作可能。暗号化・画像処理・WebSocketなど |
| `Buffer`      | Node.jsでのバイナリ処理用   | ブラウザでは使えない。`ArrayBuffer`と似た機能 |

---

### BlobからURLを作るには？

```ts
const url = URL.createObjectURL(blob);
```
- `blob`: スキームの一時URLが生成される
- `<a>`, `<img>`, `<video>` などのsrc/hrefとして使える

### 注意点

- `Blob` は **バイナリデータそのものを表すオブジェクト** であり、ファイル名などの付加情報は含まれない。ファイル名などを扱いたい場合は `File` を使う。
- `URL.createObjectURL(blob)` を使って生成されたURLはメモリ上に保持されるため、**使用後は必ず `URL.revokeObjectURL()` で解放**すること。
- `Blob` は **ブラウザ限定のAPI**。Node.js などのサーバーサイド環境では使用できない（代わりに `Buffer` や `Stream` を使用する）。
- `Blob` は読み取り専用のデータ構造であり、内容を変更することはできない（書き込みや編集が必要な場合は `ArrayBuffer` や `TypedArray` を使う）。

---
