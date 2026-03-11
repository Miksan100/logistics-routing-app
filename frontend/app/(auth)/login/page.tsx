'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { authApi } from '@/lib/api';
import { setAuth, getUser } from '@/lib/auth';
import { setVendorAuth } from '@/lib/vendorAuth';
import { Truck, Eye, EyeOff, Loader2 } from 'lucide-react';

const LiquidCrystalBackground = dynamic(
  () => import('@/components/ui/liquid-crystal-shader'),
  { ssr: false }
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (user) {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/driver/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      if (user.role === 'vendor') {
        setVendorAuth(token, user);
        router.push('/vendor/dashboard');
      } else {
        setAuth(token, user);
        router.push(user.role === 'admin' ? '/admin/dashboard' : '/driver/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-blue-950 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background */}
      <LiquidCrystalBackground
        speed={0.5}
        radii={[0.25, 0.18, 0.28]}
        smoothK={[0.22, 0.28]}
        className="opacity-90"
      />

      {/* Dark overlay to deepen the background and improve card contrast */}
      <div className="absolute inset-0 bg-blue-950/40" />

      {/* Login content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Truck className="w-9 h-9 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Fleeterzen</h1>
          <p className="text-blue-200 mt-1">Fleet Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
