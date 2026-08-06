-- ============================================
-- LifeLane - Full Database Schema
-- Database: Supabase PostgreSQL
-- ============================================
-- Execute this SQL in:
-- Supabase Dashboard → SQL Editor → New Query
-- ============================================

-- 1. Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  address             TEXT,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  emergency_available BOOLEAN DEFAULT true,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('AMBULANCE', 'POLICE', 'HOSPITAL')),
  phone           TEXT,
  organization    TEXT,
  badge_id        TEXT,
  vehicle_number  TEXT,
  hospital_name   TEXT,
  hospital_id     UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  is_verified     BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users (hospital_id);

-- 3. Ambulances Table
CREATE TABLE IF NOT EXISTS ambulances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  ambulance_code  TEXT UNIQUE NOT NULL,
  vehicle_number  TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  status          TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'EN_ROUTE', 'OFFLINE')),
  is_verified     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ambulances_user_id ON ambulances (user_id);

-- 4. Junctions Table
CREATE TABLE IF NOT EXISTS junctions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  code                    TEXT UNIQUE NOT NULL,
  latitude                DOUBLE PRECISION NOT NULL,
  longitude               DOUBLE PRECISION NOT NULL,
  assigned_police_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  signal_state            TEXT DEFAULT 'NORMAL' CHECK (signal_state IN ('NORMAL', 'RED', 'GREEN', 'EMERGENCY_PRIORITY')),
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_junctions_police_user ON junctions (assigned_police_user_id);

-- 5. Emergency Trips Table
CREATE TABLE IF NOT EXISTS emergency_trips (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambulance_id               UUID REFERENCES ambulances(id) ON DELETE CASCADE,
  hospital_id                UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  emergency_type             TEXT NOT NULL,
  start_latitude             DOUBLE PRECISION,
  start_longitude            DOUBLE PRECISION,
  current_latitude           DOUBLE PRECISION,
  current_longitude          DOUBLE PRECISION,
  destination_latitude       DOUBLE PRECISION,
  destination_longitude      DOUBLE PRECISION,
  status                     TEXT DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  estimated_distance_km      DOUBLE PRECISION,
  estimated_duration_minutes INTEGER,
  remaining_distance_km      DOUBLE PRECISION,
  remaining_duration_minutes INTEGER,
  route_coordinates          JSONB,
  route_index                INTEGER DEFAULT 0,
  last_location_update       TIMESTAMPTZ,
  started_at                 TIMESTAMPTZ,
  completed_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_ambulance ON emergency_trips (ambulance_id);
CREATE INDEX IF NOT EXISTS idx_trips_hospital ON emergency_trips (hospital_id);

-- ============================================
-- STEP 4 ALTER MIGRATIONS (Run if tables exist)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE emergency_trips ADD COLUMN IF NOT EXISTS route_coordinates JSONB;
ALTER TABLE emergency_trips ADD COLUMN IF NOT EXISTS route_index INTEGER DEFAULT 0;
ALTER TABLE emergency_trips ADD COLUMN IF NOT EXISTS remaining_distance_km DOUBLE PRECISION;
ALTER TABLE emergency_trips ADD COLUMN IF NOT EXISTS remaining_duration_minutes INTEGER;
ALTER TABLE emergency_trips ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- 6. Route Decisions Audit Table
CREATE TABLE IF NOT EXISTS route_decisions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                  UUID REFERENCES emergency_trips(id) ON DELETE CASCADE,
  decision_type            TEXT NOT NULL,
  recommended_route_id     TEXT,
  previous_route_id        TEXT,
  reason                   TEXT,
  decision_source          TEXT,
  estimated_minutes_saved  DOUBLE PRECISION,
  metadata                 JSONB,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_decisions_trip ON route_decisions (trip_id);

-- Scenario Columns for Hospitals Table
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS scenario_code TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS scenario_title TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS scenario_description TEXT;

-- 7. Traffic Signals Table
CREATE TABLE IF NOT EXISTS traffic_signals (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  junction_id                 UUID REFERENCES junctions(id) ON DELETE CASCADE,
  signal_code                 TEXT NOT NULL,
  direction                   TEXT NOT NULL CHECK (direction IN ('NORTHBOUND', 'SOUTHBOUND', 'EASTBOUND', 'WESTBOUND')),
  state                       TEXT DEFAULT 'RED' CHECK (state IN ('RED', 'AMBER', 'GREEN', 'EMERGENCY_PRIORITY', 'RETURNING_TO_NORMAL')),
  is_emergency_route_signal  BOOLEAN DEFAULT false,
  created_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traffic_signals_junction ON traffic_signals (junction_id);
