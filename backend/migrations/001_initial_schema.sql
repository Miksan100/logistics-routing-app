-- Logistics SaaS - Initial Database Schema
-- Multi-tenant: every table (except companies) has company_id

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(100) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  phone        VARCHAR(50),
  address      TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'driver')),
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  registration_number  VARCHAR(50) NOT NULL,
  make                 VARCHAR(100) NOT NULL,
  model                VARCHAR(100) NOT NULL,
  year                 INTEGER NOT NULL,
  fuel_type            VARCHAR(20) NOT NULL CHECK (fuel_type IN ('petrol','diesel','electric','hybrid','lpg')),
  service_interval_km  INTEGER DEFAULT 10000,
  current_odometer     DECIMAL(10,2) DEFAULT 0,
  tracking_device_id   VARCHAR(100),
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, registration_number)
);

CREATE TABLE IF NOT EXISTS drivers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id              UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  phone                VARCHAR(50) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  license_number       VARCHAR(100) NOT NULL,
  license_expiry       DATE NOT NULL,
  assigned_vehicle_id  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email),
  UNIQUE(company_id, license_number)
);

CREATE TABLE IF NOT EXISTS jobs (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id                  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                       VARCHAR(255) NOT NULL,
  description                 TEXT,
  pickup_address              TEXT NOT NULL,
  pickup_lat                  DECIMAL(10,8),
  pickup_lng                  DECIMAL(11,8),
  delivery_address            TEXT NOT NULL,
  delivery_lat                DECIMAL(10,8),
  delivery_lng                DECIMAL(11,8),
  scheduled_date              DATE NOT NULL,
  estimated_duration_minutes  INTEGER,
  planned_route_distance_km   DECIMAL(10,2),
  assigned_driver_id          UUID REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_vehicle_id         UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','started','in_progress','completed','cancelled')),
  cancellation_reason         TEXT,
  started_at                  TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  created_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_status_updates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  driver_id        UUID REFERENCES drivers(id) ON DELETE SET NULL,
  previous_status  VARCHAR(20),
  new_status       VARCHAR(20) NOT NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS odometer_logs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id          UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id         UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  log_date           DATE NOT NULL,
  start_odometer     DECIMAL(10,2),
  end_odometer       DECIMAL(10,2),
  distance_travelled DECIMAL(10,2),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, vehicle_id, log_date)
);

CREATE TABLE IF NOT EXISTS gps_tracking (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id  VARCHAR(255) NOT NULL,
  latitude    DECIMAL(10,8) NOT NULL,
  longitude   DECIMAL(11,8) NOT NULL,
  speed       DECIMAL(6,2),
  timestamp   TIMESTAMPTZ NOT NULL,
  provider    VARCHAR(100),
  raw_payload JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id     ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_drivers_company_id   ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id      ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id  ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id      ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date  ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status          ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_driver_id       ON jobs(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_job_updates_job_id   ON job_status_updates(job_id);
CREATE INDEX IF NOT EXISTS idx_odometer_driver_date ON odometer_logs(driver_id, log_date);
CREATE INDEX IF NOT EXISTS idx_gps_vehicle_time     ON gps_tracking(vehicle_id, timestamp);

-- Seed: demo company + admin (password: Admin1234!)
INSERT INTO companies (id, name, slug, email, phone, address)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Demo Logistics Co.', 'demo', 'admin@demo.com',
  '+1 555 000 0000', '1 Demo Street, Demo City'
) ON CONFLICT DO NOTHING;

INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@demo.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq0t6Se',
  'Admin', 'User', 'admin'
) ON CONFLICT DO NOTHING;
