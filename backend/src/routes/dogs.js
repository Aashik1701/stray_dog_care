const express = require('express');
const {
  getAllDogs,
  getDogById,
  createDog,
  updateDog,
  updateDogStatus,
  getDogsByLocation,
  deleteDog,
  getDogsStatistics
} = require('../controllers/dogController');
const { auth, authorize, sameOrganization, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (with optional auth for organization filtering)
router.get('/', optionalAuth, getAllDogs);
router.get('/location', getDogsByLocation);
router.get('/stats', getDogsStatistics);
router.get('/:id', getDogById);

// Protected routes (require authentication)
router.use(auth); // Apply auth middleware to all routes below
router.use(sameOrganization); // Apply organization filtering

router.post('/', createDog);
router.put('/:id', updateDog);
router.patch('/:id/status', updateDogStatus);

// Admin only routes
router.delete('/:id', authorize('system_admin', 'municipal_admin'), deleteDog);

module.exports = router;
