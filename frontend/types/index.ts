export interface User {
  id: string;
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'driver';
  driverProfile?: { id: string; assigned_vehicle_id: string | null } | null;
}

export interface Driver {
  id: string;
  company_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string;
  assigned_vehicle_id: string | null;
  is_active: boolean;
  registration_number?: string;
  make?: string;
  model?: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  registration_number: string;
  make: string;
  model: string;
  year: number;
  fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg';
  service_interval_km: number;
  current_odometer: number;
  tracking_device_id: string | null;
  is_active: boolean;
  assigned_driver_name?: string;
}

export type JobStatus = 'pending' | 'started' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  scheduled_date: string;
  estimated_duration_minutes: number | null;
  planned_route_distance_km: number | null;
  assigned_driver_id: string | null;
  assigned_vehicle_id: string | null;
  status: JobStatus;
  cancellation_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  driver_name?: string;
  driver_phone?: string;
  registration_number?: string;
  make?: string;
  model?: string;
  statusHistory?: StatusUpdate[];
}

export interface StatusUpdate {
  id: string;
  job_id: string;
  driver_id: string | null;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

export interface OdometerLog {
  id: string;
  driver_id: string;
  vehicle_id: string;
  log_date: string;
  start_odometer: number | null;
  end_odometer: number | null;
  distance_travelled: number | null;
  driver_name?: string;
  registration_number?: string;
}

export interface DashboardStats {
  date: string;
  jobs: {
    total_today: string;
    completed_today: string;
    in_progress_today: string;
    cancelled_today: string;
    pending_today: string;
    started_today: string;
  };
  drivers: {
    total_drivers: string;
    active_drivers: string;
  };
  vehicles: {
    total_vehicles: string;
    active_vehicles: string;
  };
}

export interface GPSPosition {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
  registration_number?: string;
  make?: string;
  model?: string;
}
