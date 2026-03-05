import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('logistics_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const isPublic = pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api');
  const isAdminRoute = pathname.startsWith('/admin');
  const isDriverRoute = pathname.startsWith('/driver');

  // Check auth via cookie for SSR; client-side localStorage handles most auth
  // For SSR route protection, rely on per-page checks using client state
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
