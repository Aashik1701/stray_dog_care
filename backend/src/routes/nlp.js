const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { analyzeReport, getStatus, resetCircuit, analyzeLimiter, predict, embed, pipeline } = require('../controllers/nlpController');

// Analyze notes text (requires auth)
router.post('/analyze-report', auth, analyzeLimiter, analyzeReport);

// NLP client status (optional auth)
router.get('/status', getStatus);

// Reset circuit breaker (for development/troubleshooting)
router.post('/reset-circuit', auth, resetCircuit);

// Quick prediction test endpoint (public)
router.get('/predict', predict);

// Get embedding (requires auth)
router.post('/embed', auth, embed);

// Unified pipeline (requires auth)
router.post('/pipeline', auth, analyzeLimiter, pipeline);

module.exports = router;
