-- Migration 002: Vendor tier (super-admin portal + subscription plans)

-- Vendor user accounts (completely separate from company users)
CREATE TABLE IF NOT EXISTS vendor_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plans (prices finalized by vendor)
CREATE TABLE IF NOT EXISTS plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  max_drivers   INTEGER,
  max_vehicles  INTEGER,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Extend companies with subscription + billing columns
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan_id                     UUID REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS plan_status                 VARCHAR(20) DEFAULT 'trial'
                                                         CHECK (plan_status IN ('trial','active','suspended','cancelled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at               TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS billing_email               VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_gateway_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_gateway_sub_id      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS notes                       TEXT;

-- Seed placeholder plans
INSERT INTO plans (name, price_monthly, max_drivers, max_vehicles) VALUES
  ('Starter',      49.00,  5,   5),
  ('Growth',       99.00,  20,  20),
  ('Professional', 199.00, NULL, NULL)
ON CONFLICT DO NOTHING;
