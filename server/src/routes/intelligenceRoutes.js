const express = require('express');
const { analyzeRoutesHandler } = require('../controllers/intelligenceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.post('/routes', analyzeRoutesHandler);

module.exports = router;
