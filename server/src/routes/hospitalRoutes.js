const express = require('express');
const { getHospitals, getHospitalById } = require('../controllers/hospitalController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/', getHospitals);
router.get('/:id', getHospitalById);

module.exports = router;
