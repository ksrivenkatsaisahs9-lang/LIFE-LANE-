const express = require('express');
const { previewRoute } = require('../controllers/routeController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.post('/preview', previewRoute);

module.exports = router;
