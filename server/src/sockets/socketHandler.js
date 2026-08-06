const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO server on top of existing Express HTTP server
 */
function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // JWT Authentication Middleware for Socket.IO
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) {
        return next(new Error('Authentication token required'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = {
        id: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (err) {
      console.warn('Socket connection rejected - Invalid JWT:', err.message);
      return next(new Error('Authentication failed'));
    }
  });

  // Socket Connection Handlers
  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    console.log(`Socket connected: ${socket.id} | User: ${userId} | Role: ${role}`);

    // Join user room
    socket.join(`user:${userId}`);
    if (role === 'HOSPITAL') {
      socket.join('hospitals');
    }
    if (role === 'POLICE') {
      socket.join('junctions');
      socket.join('police');
    }

    // Room join handlers
    socket.on('join:trip', (tripId) => {
      if (tripId) {
        socket.join(`trip:${tripId}`);
      }
    });

    socket.on('join:hospital', (hospitalId) => {
      socket.join('hospitals');
      if (hospitalId) {
        socket.join(`hospital:${hospitalId}`);
      }
    });

    socket.on('join:junctions', () => {
      socket.join('junctions');
      socket.join('police');
    });

    socket.on('join:ambulance', (ambulanceId) => {
      if (ambulanceId) {
        socket.join(`ambulance:${ambulanceId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      // Clean disconnect logging
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }
  return io;
}

module.exports = {
  initSocketServer,
  getIO,
};
