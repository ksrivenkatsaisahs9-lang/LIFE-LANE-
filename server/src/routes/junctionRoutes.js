const express = require('express');
const { getJunctions, getMyJunctions, updateJunctionPriority } = require('../controllers/junctionController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/', getJunctions);
router.get('/me', authorizeRoles('POLICE'), getMyJunctions);
router.post('/:id/priority', updateJunctionPriority);

module.exports = router;
