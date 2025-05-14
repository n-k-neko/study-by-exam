/**
 * Next.jsのfetch APIで使用するキャッシュ設定
 * 
 * @property revalidate - キャッシュの再検証間隔（秒）
 * @property tags - キャッシュタグ（キャッシュの無効化に使用）
 */
export interface CacheOptions {
  revalidate?: number;  // キャッシュの再検証間隔（秒）
  tags?: string[];      // キャッシュタグ（キャッシュの無効化に使用）
} 