const express = require('express');
const { triggerCongestionDemo, injectCongestionHandler, clearDisruptionHandler, setSpeedHandler, resetDemoHandler } = require('../controllers/demoController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.post('/congestion', injectCongestionHandler);
router.post('/congestion/clear', clearDisruptionHandler);
router.post('/trips/:tripId/congestion', triggerCongestionDemo);
router.post('/speed', setSpeedHandler);
router.post('/reset', resetDemoHandler);

module.exports = router;
