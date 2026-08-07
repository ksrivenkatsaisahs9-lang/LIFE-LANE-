const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const junctionRoutes = require('./routes/junctionRoutes');
const routeRoutes = require('./routes/routeRoutes');
const tripRoutes = require('./routes/tripRoutes');
const intelligenceRoutes = require('./routes/intelligenceRoutes');
const demoRoutes = require('./routes/demoRoutes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LifeLane API is running'
  });
});

const { getEarlyWarningEvents } = require('./controllers/routeController');

// API Routes
app.get('/api/v1/events/early-warning', getEarlyWarningEvents);
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/junctions', junctionRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/demo', demoRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
