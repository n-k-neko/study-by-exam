/**
 * NextAuthの内部処理で使用されるエンドポイント
 * 
 * このエンドポイントは直接APIとして叩くことはないが、以下の場面で使用される：
 * 1. signIn/signOut関数の内部処理
 * 2. JWTの生成・検証・更新
 * 3. セッション管理
 * 
 * 認証フロー：
 * 1. ユーザーがログインフォームを送信
 * 2. server-actions/userActions.tsのlogin関数が呼ばれる
 * 3. UserClientを通じてバックエンドAPIで認証
 * 4. 認証成功後、signIn('credentials', {...})が呼ばれる
 * 5. このエンドポイントが呼び出され、authOptionsのauthorizeコールバックが実行
 * 6. JWTの生成と保存
 */
import { handlers } from "@/lib/bff/auth/auth";
export const { GET, POST } = handlers; 