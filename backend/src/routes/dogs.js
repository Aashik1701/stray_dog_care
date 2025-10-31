const express = require('express');
const {
  getAllDogs,
  getDogById,
  createDog,
  updateDog,
  updateDogStatus,
  getDogsByLocation,
  deleteDog,
  getDogsStatistics,
  createDogWithNLP
} = require('../controllers/dogController');
const { auth, authorize, sameOrganization, optionalAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const rateLimit = require('express-rate-limit');

// Rate limit NLP-assisted creation to protect NLP service
const nlpCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (with optional auth for organization filtering)
router.get('/', optionalAuth, getAllDogs);
router.get('/location', getDogsByLocation);
router.get('/stats', getDogsStatistics);
router.get('/:id', getDogById);

// Protected routes (require authentication)
router.use(auth); // Apply auth middleware to all routes below
router.use(sameOrganization); // Apply organization filtering

router.post('/', createDog);
router.post('/nlp', nlpCreateLimiter, createDogWithNLP);
router.put('/:id', updateDog);
router.patch('/:id/status', requireRole('field_worker','ngo_coordinator','veterinarian','municipal_admin','system_admin'), updateDogStatus);

// Admin only routes
router.delete('/:id', authorize('system_admin', 'municipal_admin'), deleteDog);

module.exports = router;
