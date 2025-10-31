const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { analyzeReport, getStatus, analyzeLimiter } = require('../controllers/nlpController');

// Analyze notes text (requires auth)
router.post('/analyze-report', auth, analyzeLimiter, analyzeReport);

// NLP client status (optional auth)
router.get('/status', getStatus);

module.exports = router;
