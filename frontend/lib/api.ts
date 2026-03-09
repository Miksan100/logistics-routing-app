import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getToken, clearAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api: AxiosInstance = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth();
      // Don't redirect if already on login page (e.g. failed login attempt)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// Drivers
export const driversApi = {
  list: () => api.get('/drivers').then((r) => r.data),
  get: (id: string) => api.get(`/drivers/${id}`).then((r) => r.data),
  me: () => api.get('/drivers/me').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/drivers', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/drivers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
};

// Vehicles
export const vehiclesApi = {
  list: () => api.get('/vehicles').then((r) => r.data),
  get: (id: string) => api.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/vehicles', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/vehicles/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

// Jobs
export const jobsApi = {
  list: (params?: Record<string, string>) => api.get('/jobs', { params }).then((r) => r.data),
  myJobs: () => api.get('/jobs/my-jobs').then((r) => r.data),
  get: (id: string) => api.get(`/jobs/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/jobs', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/jobs/${id}`, data).then((r) => r.data),
  start: (id: string) => api.post(`/jobs/${id}/start`).then((r) => r.data),
  progress: (id: string) => api.post(`/jobs/${id}/progress`).then((r) => r.data),
  complete: (id: string) => api.post(`/jobs/${id}/complete`).then((r) => r.data),
  cancel: (id: string, reason: string) => api.post(`/jobs/${id}/cancel`, { reason }).then((r) => r.data),
};

// Odometer
export const odometerApi = {
  startDay: (startOdometer: number, vehicleId?: string) => api.post('/odometer/start-day', { startOdometer, vehicleId }).then((r) => r.data),
  endDay: (endOdometer: number, vehicleId?: string) => api.post('/odometer/end-day', { endOdometer, vehicleId }).then((r) => r.data),
  today: () => api.get('/odometer/today').then((r) => r.data),
  list: (params?: Record<string, string>) => api.get('/odometer', { params }).then((r) => r.data),
};

// Analytics
export const analyticsApi = {
  dashboard: (date?: string) => api.get('/analytics/dashboard', { params: date ? { date } : {} }).then((r) => r.data),
  driverProductivity: (dateFrom: string, dateTo: string) =>
    api.get('/analytics/driver-productivity', { params: { dateFrom, dateTo } }).then((r) => r.data),
  fleetUsage: (dateFrom: string, dateTo: string) =>
    api.get('/analytics/fleet-usage', { params: { dateFrom, dateTo } }).then((r) => r.data),
  jobAnalytics: (dateFrom: string, dateTo: string) =>
    api.get('/analytics/jobs', { params: { dateFrom, dateTo } }).then((r) => r.data),
};

// GPS Tracking
export const trackingApi = {
  positions: () => api.get('/tracking/positions').then((r) => r.data),
  history: (vehicleId: string, from?: string, to?: string) =>
    api.get(`/tracking/history/${vehicleId}`, { params: { from, to } }).then((r) => r.data),
  recordJobGPS: (jobId: string, latitude: number, longitude: number, accuracy?: number) =>
    api.post(`/tracking/job/${jobId}/track`, { latitude, longitude, accuracy }).then((r) => r.data),
  jobRoute: (jobId: string) => api.get(`/tracking/job/${jobId}/route`).then((r) => r.data),
  jobHistory: () => api.get('/tracking/jobs').then((r) => r.data),
};
