const TOKEN_KEY = 'fl_vendor_token';
const USER_KEY = 'fl_vendor_user';

export interface VendorUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function setVendorAuth(token: string, vendor: VendorUser): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(vendor));
}

export function getVendorToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getVendorUser(): VendorUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearVendorAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
