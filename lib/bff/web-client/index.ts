import { createApiClient } from './apiClient';
import { BffApiClient } from './infrastructure/bffApiClient';

/**
 * APIクライアントのエントリーポイント
 * 
 * 使用例：
 * ```typescript
 * import { api } from '@/lib/bff/web-client';
 * 
 * // ユーザー情報の取得
 * const user = await api.getUser.get<User>({ id: '123' });
 * 
 * // 試験一覧の取得
 * const exams = await api.getExams.get<Exam[]>();
 * 
 * // 試験の提出
 * const result = await api.submitExam.post<ExamResult>(data, { id: examId });
 * ```
 * 
 * Note:
 * - このモジュールが最初にimportされた時点で1つのインスタンスが作成される
 * - 以降の同一モジュールのimportでは、作成済みの同じインスタンスが再利用される（シングルトン）
 * - テスト時のモック化や設定の動的変更が必要な場合は、ファクトリー関数として提供することも検討する
 */
export const api = createApiClient(new BffApiClient());
export type { ApiClient } from './apiClient';
export type { ApiEndpointKey } from './types'; 