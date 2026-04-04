'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

function ImpersonateHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const userRaw = params.get('user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(atob(userRaw));
        setAuth(token, user);
        router.replace('/admin/dashboard');
      } catch {
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ImpersonateHandler />
    </Suspense>
  );
}
