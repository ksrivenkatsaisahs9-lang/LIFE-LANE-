const express = require('express');
const { createTrip, getActiveTrip, getTripById, completeTripHandler, cancelTripHandler, resetDemo } = require('../controllers/tripController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/', createTrip);
router.get('/active', getActiveTrip);
router.get('/:id', getTripById);
router.post('/:id/complete', completeTripHandler);
router.post('/:id/cancel', cancelTripHandler);
router.post('/demo/reset', resetDemo);

module.exports = router;
