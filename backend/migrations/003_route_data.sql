-- Migration 003: store planned route data on jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS route_polyline TEXT,
  ADD COLUMN IF NOT EXISTS route_distance_km DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS route_duration_minutes INT;
