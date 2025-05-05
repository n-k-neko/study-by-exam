/**
 * リトライ設定
 */
const RETRY_CONFIG = {
  maxAttempts: 3,        // 最大リトライ回数
  initialDelay: 1000,    // 初回リトライまでの待機時間（ミリ秒）
  maxDelay: 5000,        // 最大待機時間（ミリ秒）
  backoffFactor: 2,      // 待機時間の増加倍率
};

/**
 * 指定された時間だけ待機する
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * リトライ可能なエラーかどうかを判定
 */
const isRetryableError = (error: unknown): boolean => {
  // ネットワークエラー
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }

  // レスポンスエラー
  if (error instanceof Error) {
    try {
      const errorData = JSON.parse(error.message);
      // 500番台のエラー、または特定のステータスコードの場合にリトライ
      return errorData.status >= 500 || [408, 429].includes(errorData.status);
    } catch {
      return false;
    }
  }

  return false;
};

/**
 * リトライ処理を実行する
 * @param operation - リトライ対象の非同期処理
 * @returns 処理結果
 */
export async function retry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let delay = RETRY_CONFIG.initialDelay;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;

      // 最大リトライ回数に達した場合、またはリトライ不可能なエラーの場合はエラーを投げる
      if (attempt >= RETRY_CONFIG.maxAttempts || !isRetryableError(error)) {
        throw error;
      }

      // 待機時間を計算（exponential backoff）
      delay = Math.min(
        delay * RETRY_CONFIG.backoffFactor,
        RETRY_CONFIG.maxDelay
      );

      // 次のリトライまで待機
      await wait(delay);
    }
  }
} 