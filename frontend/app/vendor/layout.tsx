'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getVendorUser, clearVendorAuth } from '@/lib/vendorAuth';
import type { VendorUser } from '@/lib/vendorAuth';
import { LayoutDashboard, Building2, LogOut, Truck, Mail } from 'lucide-react';

const nav = [
  { href: '/vendor/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/vendor/companies',     label: 'Companies',     icon: Building2 },
  { href: '/vendor/email-history', label: 'Email History', icon: Mail },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [vendor, setVendor] = useState<VendorUser | null>(null);

  useEffect(() => {
    const v = getVendorUser();
    if (!v) { router.replace('/login'); return; }
    setVendor(v);
  }, [router, pathname]);
  if (!vendor) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 flex-shrink-0 bg-blue-900 text-white shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-800">
          <Truck className="w-8 h-8 text-white" />
          <div>
            <span className="text-xl font-bold block">Fleeterzen</span>
            <span className="text-xs text-blue-300">Vendor Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/') ||
              (href === '/vendor/companies' && pathname.startsWith('/vendor/companies'));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-sm font-semibold">
              {vendor.firstName[0]}{vendor.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{vendor.firstName} {vendor.lastName}</p>
              <p className="text-xs text-blue-300 truncate">{vendor.email}</p>
            </div>
          </div>
          <button
            onClick={() => { clearVendorAuth(); router.push('/login'); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-blue-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
