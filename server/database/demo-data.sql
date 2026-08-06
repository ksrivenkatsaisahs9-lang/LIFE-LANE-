-- ============================================
-- LifeLane - Demo Seed Data (All 5 Hospital Scenarios)
-- Database: Supabase PostgreSQL
-- ============================================
-- Run in Supabase SQL Editor after schema.sql
-- ============================================

-- 1. Insert/Update Demo Hospitals
INSERT INTO hospitals (name, address, latitude, longitude, emergency_available, is_active, scenario_code, scenario_title, scenario_description)
VALUES 
  ('City General Hospital', 'Indiranagar, Bengaluru', 12.9592, 77.6445, true, true, 'INTERSECTION_CORRIDOR', 'Intersection Corridor', 'Multiple signalized intersections require coordinated emergency passage.'),
  ('St. Martha Emergency Centre', 'Nrupatunga Road, Bengaluru', 12.9642, 77.5960, true, true, 'CONGESTION_REROUTE', 'Congestion Rerouting', 'Unexpected congestion develops on initial route, triggering intelligent rerouting.'),
  ('Central Medical Centre', 'MG Road, Bengaluru', 12.9716, 77.5946, true, true, 'COMPLEX_JUNCTION', 'Complex Junction Corridor', 'Major multi-direction intersection requiring precision signal priority timing.'),
  ('Lakeside Trauma Centre', 'Ulsoor Lake Corridor, Bengaluru', 12.9820, 77.6180, true, true, 'ROAD_INCIDENT', 'Road Incident Corridor', 'Corridor with road incident requiring advance vehicle warning and route evaluation.'),
  ('Metro Emergency Hospital', 'Outer Ring Rd / Bellandur, Bengaluru', 12.9280, 77.6850, true, true, 'CAMERA_CORRIDOR', 'Camera Monitored Corridor', 'Roadside AI camera points provide real-time lane obstruction and congestion intelligence.')
ON CONFLICT DO NOTHING;

-- 2. Link Demo Ambulance to driver@lifelane.demo
DO $$
DECLARE
  v_driver_id UUID;
BEGIN
  SELECT id INTO v_driver_id FROM users WHERE email = 'driver@lifelane.demo';
  IF v_driver_id IS NOT NULL THEN
    INSERT INTO ambulances (user_id, ambulance_code, vehicle_number, latitude, longitude, status, is_verified)
    VALUES (v_driver_id, 'AMB-1042', 'AMB-1042', 12.9352, 77.6245, 'AVAILABLE', true)
    ON CONFLICT (ambulance_code) 
    DO UPDATE SET 
      user_id = EXCLUDED.user_id,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude;
  END IF;
END $$;

-- 3. Insert Demo Junctions & assign police@lifelane.demo to Richmond Circle
DO $$
DECLARE
  v_police_id UUID;
BEGIN
  SELECT id INTO v_police_id FROM users WHERE email = 'police@lifelane.demo';
  
  INSERT INTO junctions (name, code, latitude, longitude, assigned_police_user_id, signal_state, is_active)
  VALUES 
    ('Sony World Junction', 'JNC-A', 12.9450, 77.6300, NULL, 'NORMAL', true),
    ('Dairy Circle Junction', 'JNC-B', 12.9380, 77.6020, NULL, 'NORMAL', true),
    ('Richmond Circle Junction', 'JNC-C', 12.9580, 77.5970, v_police_id, 'NORMAL', true)
  ON CONFLICT (code)
  DO UPDATE SET
    assigned_police_user_id = EXCLUDED.assigned_police_user_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;
END $$;
