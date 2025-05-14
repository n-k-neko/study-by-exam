/**
 * APIリクエストのオプション
 * 
 * リクエストごとのオプションを設定する。
 * 
 * サーキットブレーカやリトライなどドメインごとのオプションは、環境変数をもとに、config.tsで設定する。
 */
export interface RequestOptions {
    timeout?: number;
    headers?: Record<string, string>;
}