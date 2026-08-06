import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem('lifelane_token');
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  // Derive Socket URL from API URL (e.g. http://localhost:5000/api -> http://localhost:5000)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const socketUrl = apiUrl.replace(/\/api\/?$/, '');

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    // Socket connected
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection warning:', err.message);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return connectSocket();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinTripRoom(tripId) {
  const s = getSocket();
  if (s && tripId) {
    s.emit('join:trip', tripId);
  }
}

export function joinHospitalRoom(hospitalId) {
  const s = getSocket();
  if (s && hospitalId) {
    s.emit('join:hospital', hospitalId);
  }
}

export function joinAmbulanceRoom(ambulanceId) {
  const s = getSocket();
  if (s && ambulanceId) {
    s.emit('join:ambulance', ambulanceId);
  }
}
