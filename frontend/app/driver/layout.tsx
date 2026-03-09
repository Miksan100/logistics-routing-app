'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth } from '@/lib/auth';
import type { User } from '@/types';
import { Home, LogOut, Truck, Menu, X } from 'lucide-react';

const nav = [
  { href: '/driver/dashboard', label: 'My Jobs', icon: Home },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'driver') { router.replace('/login'); return; }
    setUser(u);
  }, [router]);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-blue-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-300" />
            <span className="font-bold text-lg">Fleeterzen</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-sm font-semibold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom nav (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40">
        <div className="flex">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href.replace('/dashboard', ''));
            return (
              <Link key={href} href={href} className={'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ' + (active ? 'text-blue-600' : 'text-gray-500')}>
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => { clearAuth(); router.push('/login'); }}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-gray-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-xs font-medium">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
