'use client';

import { logout } from '@/lib/bff/server-actions/userActions';

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      ログアウト
    </button>
  );
} 