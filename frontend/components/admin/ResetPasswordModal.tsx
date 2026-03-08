'use client';
import { useState } from 'react';
import type { Driver } from '@/types';
import { X, KeyRound, RefreshCw, Copy, Check, Loader2 } from 'lucide-react';
import { driversApi } from '@/lib/api';

interface Props {
  driver: Driver;
  onClose: () => void;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function ResetPasswordModal({ driver, onClose }: Props) {
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!password.trim()) return;
    setSaving(true);
    setError('');
    try {
      await driversApi.update(driver.id, { password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" /> Reset Password
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Setting a new password for <span className="font-semibold">{driver.first_name} {driver.last_name}</span>
            <span className="block text-gray-400 text-xs mt-0.5">{driver.email}</span>
          </p>

          {!done ? (
            <>
              <div>
                <label className="label">New Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      className="input-field font-mono pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      title="Copy"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                    title="Generate new password"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Password is shown in plain text. Copy it before saving.</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !password.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Password
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-800 mb-3">Password reset successfully!</p>
                <p className="text-xs text-green-700 mb-2">Share these credentials with the driver:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium">{driver.email}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Password:</span>
                    <span className="font-mono font-bold text-gray-900">{password}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Password'}
              </button>
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
