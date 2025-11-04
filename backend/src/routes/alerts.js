const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
  getAlertStats
} = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get alert statistics
router.get('/stats', getAlertStats);

// Get all alerts
router.get('/', getAlerts);

// Get alert by ID
router.get('/:id', getAlertById);

// Acknowledge alert
router.post('/:id/acknowledge', acknowledgeAlert);

// Assign alert
router.post('/:id/assign', assignAlert);

// Resolve alert
router.post('/:id/resolve', resolveAlert);

module.exports = router;

