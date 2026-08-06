require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocketServer } = require('./sockets/socketHandler');
const { resumeActiveSimulations } = require('./services/tripSimulationService');

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Socket.IO on the SAME HTTP server
initSocketServer(server);

// Resume any active emergency trip simulations
resumeActiveSimulations();

server.listen(PORT, () => {
  console.log(`LifeLane API & Real-Time Socket Server running on port ${PORT}`);
});
