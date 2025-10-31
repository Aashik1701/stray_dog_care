const nlpService = require('../services/nlpService');
const rateLimit = require('express-rate-limit');

// Optional per-route limiter (more strict)
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many NLP analyze requests, please slow down.'
});

// POST /api/nlp/analyze-report
async function analyzeReport(req, res) {
  try {
    const { text, language = 'en' } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }
    const result = await nlpService.analyzeReport(text, language);
    return res.json({ success: true, data: result });
  } catch (e) {
    const status = e?.response?.status || 500;
    return res.status(status).json({ success: false, message: e.message || 'NLP analyze failed' });
  }
}

// GET /api/nlp/status
async function getStatus(req, res) {
  try {
    const status = nlpService.status?.() || { enabled: false };
    const health = await nlpService.checkHealth?.();
    return res.json({ success: true, data: { ...status, serviceHealthy: !!health?.reachable } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to get NLP status' });
  }
}

module.exports = {
  analyzeReport,
  getStatus,
  analyzeLimiter,
};
