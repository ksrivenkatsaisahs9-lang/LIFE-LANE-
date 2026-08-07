require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

const demoUsers = [
  {
    name: 'Arjun Kumar',
    email: 'driver@lifelane.demo',
    password: 'Demo@123',
    role: 'AMBULANCE',
    area: 'Koramangala, Bengaluru',
    vehicle_number: 'AMB-1042',
  },
  {
    name: 'Vikram Rao',
    email: 'police@lifelane.demo',
    password: 'Demo@123',
    role: 'POLICE',
    area: 'Richmond Circle, Bengaluru',
    badge_id: 'TP-2147',
  },
  {
    name: 'Emergency Desk',
    email: 'hospital@lifelane.demo',
    password: 'Demo@123',
    role: 'HOSPITAL',
    area: 'Indiranagar, Bengaluru',
    hospital_name: 'City General Hospital',
  },
];

const demoHospitals = [
  { name: 'City General Hospital', address: 'Indiranagar, Bengaluru', latitude: 12.9592, longitude: 77.6445, emergency_available: true },
  { name: 'St. Martha Emergency Centre', address: 'Nrupatunga Road, Bengaluru', latitude: 12.9642, longitude: 77.5960, emergency_available: true },
  { name: 'Central Medical Centre', address: 'MG Road, Bengaluru', latitude: 12.9716, longitude: 77.5946, emergency_available: true },
];

const demoJunctions = [
  { name: 'Sony World Junction', code: 'JNC-A', latitude: 12.9450, longitude: 77.6300, signal_state: 'NORMAL' },
  { name: 'Dairy Circle Junction', code: 'JNC-B', latitude: 12.9380, longitude: 77.6020, signal_state: 'NORMAL' },
  { name: 'Richmond Circle Junction', code: 'JNC-C', latitude: 12.9580, longitude: 77.5970, signal_state: 'NORMAL' },
];

const seedDemoData = async () => {
  try {
    const userMap = {};

    // 1. Seed Hospitals first to get hospital IDs
    const hospitalMap = {};
    for (const hosp of demoHospitals) {
      let { data: existing } = await supabase
        .from('hospitals')
        .select('id, name')
        .eq('name', hosp.name)
        .maybeSingle();

      if (!existing) {
        const { data: created, error } = await supabase.from('hospitals').insert(hosp).select('id, name').single();
        if (error) console.error(`Failed hospital ${hosp.name}:`, error.message);
        else existing = created;
      }
      if (existing) {
        hospitalMap[existing.name] = existing.id;
      }
    }

    // 2. Seed Users & link hospital_id
    for (const userData of demoUsers) {
      const { data: existing } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', userData.email)
        .maybeSingle();

      const cityHospitalId = hospitalMap['City General Hospital'];

      if (existing) {
        userMap[userData.email] = existing.id;
        if (userData.role === 'HOSPITAL' && cityHospitalId) {
          await supabase.from('users').update({ hospital_id: cityHospitalId }).eq('id', existing.id);
        }
        console.log(`User exists: ${userData.email}`);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);
      const { password, ...rest } = userData;

      if (userData.role === 'HOSPITAL' && cityHospitalId) {
        rest.hospital_id = cityHospitalId;
      }

      const { data: created, error } = await supabase
        .from('users')
        .insert({ ...rest, password_hash: passwordHash })
        .select('id, email')
        .single();

      if (error) {
        console.error(`Failed user ${userData.email}:`, error.message);
      } else {
        userMap[userData.email] = created.id;
        console.log(`Created user: ${userData.email}`);
      }
    }

    // 3. Seed Ambulance (linked to driver@lifelane.demo)
    const driverId = userMap['driver@lifelane.demo'];
    if (driverId) {
      const { data: existingAmb } = await supabase
        .from('ambulances')
        .select('id')
        .eq('ambulance_code', 'AMB-1042')
        .maybeSingle();

      if (!existingAmb) {
        const { error } = await supabase.from('ambulances').insert({
          user_id: driverId,
          ambulance_code: 'AMB-1042',
          vehicle_number: 'AMB-1042',
          latitude: 12.9352,
          longitude: 77.6245,
          status: 'AVAILABLE',
          is_verified: true,
        });
        if (error) console.error('Failed ambulance insert:', error.message);
        else console.log('Created ambulance: AMB-1042');
      }
    }

    // 4. Seed Junctions (JNC-C assigned to police@lifelane.demo)
    const policeId = userMap['police@lifelane.demo'];
    for (const jnc of demoJunctions) {
      const { data: existingJnc } = await supabase
        .from('junctions')
        .select('id')
        .eq('code', jnc.code)
        .maybeSingle();

      if (!existingJnc) {
        const payload = { ...jnc };
        if (jnc.code === 'JNC-C' && policeId) {
          payload.assigned_police_user_id = policeId;
        }
        const { error } = await supabase.from('junctions').insert(payload);
        if (error) console.error(`Failed junction ${jnc.code}:`, error.message);
        else console.log(`Created junction: ${jnc.code}`);
      }
    }

    console.log('Demo seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedDemoData();
