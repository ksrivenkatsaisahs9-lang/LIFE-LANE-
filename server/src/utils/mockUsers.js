const bcrypt = require('bcrypt');

const MOCK_USERS = {
  'driver@lifelane.demo': {
    id: 'd1111111-1111-1111-1111-111111111111',
    name: 'Arjun Kumar',
    email: 'driver@lifelane.demo',
    role: 'AMBULANCE',
    area: 'Koramangala, Bengaluru',
    vehicle_number: 'AMB-1042',
    phone: '+91 9876543210',
    is_verified: true,
    is_active: true,
    password_hash: bcrypt.hashSync('Demo@123', 10),
  },
  'police@lifelane.demo': {
    id: 'd2222222-2222-2222-2222-222222222222',
    name: 'Vikram Rao',
    email: 'police@lifelane.demo',
    role: 'POLICE',
    area: 'Richmond Circle, Bengaluru',
    badge_id: 'TP-2147',
    phone: '+91 9876543211',
    is_verified: true,
    is_active: true,
    password_hash: bcrypt.hashSync('Demo@123', 10),
  },
  'hospital@lifelane.demo': {
    id: 'd3333333-3333-3333-3333-333333333333',
    name: 'Emergency Desk',
    email: 'hospital@lifelane.demo',
    role: 'HOSPITAL',
    area: 'Indiranagar, Bengaluru',
    hospital_name: 'City General Hospital',
    hospital_id: 'hosp-1',
    phone: '+91 9876543212',
    is_verified: true,
    is_active: true,
    password_hash: bcrypt.hashSync('Demo@123', 10),
  },
};

module.exports = { MOCK_USERS };
