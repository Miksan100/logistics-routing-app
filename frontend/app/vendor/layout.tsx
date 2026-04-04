'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getVendorUser, clearVendorAuth } from '@/lib/vendorAuth';
import type { VendorUser } from '@/lib/vendorAuth';
import { LayoutDashboard, Building2, LogOut, Truck, Mail, Menu, X } from 'lucide-react';

const nav = [
  { href: '/vendor/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/vendor/companies',     label: 'Companies',     icon: Building2 },
  { href: '/vendor/email-history', label: 'Email History', icon: Mail },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [vendor, setVendor] = useState<VendorUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const v = getVendorUser();
    if (!v) { router.replace('/login'); return; }
    setVendor(v);
  }, [router, pathname]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!vendor) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-800">
        <Truck className="w-8 h-8 text-white flex-shrink-0" />
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
          <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
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
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-blue-900 text-white shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-blue-900 text-white shadow-xl transform transition-transform duration-300 md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-blue-900 text-white shadow-md flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Truck className="w-6 h-6" />
          <span className="font-bold text-lg">Fleeterzen</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
