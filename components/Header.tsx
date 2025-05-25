import Link from 'next/link';
import { LogoutButton } from './LogoutButton';
import { auth } from '@/lib/bff/auth/auth';

interface HeaderProps {
  pageTitle?: string;
}

export async function Header({ pageTitle }: HeaderProps) {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <header className="bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-4xl font-black text-white tracking-wider">
                Study By Exam
              </span>
            </Link>
            {pageTitle && (
              <div className="ml-12 flex items-center">
                <span className="text-2xl font-bold text-blue-100">
                  {pageTitle}
                </span>
              </div>
            )}
          </div>
          {isLoggedIn && (
            <div className="flex items-center">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 