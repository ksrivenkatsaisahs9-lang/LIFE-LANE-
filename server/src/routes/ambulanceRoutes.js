const express = require('express');
const { getMyAmbulance } = require('../controllers/ambulanceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/me', getMyAmbulance);

module.exports = router;
