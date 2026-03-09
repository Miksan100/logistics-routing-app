import axios from 'axios';
import { getVendorToken } from './vendorAuth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const vendorApi = axios.create({
  baseURL: `${BASE}/vendor`,
});

vendorApi.interceptors.request.use((config) => {
  const token = getVendorToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default vendorApi;
