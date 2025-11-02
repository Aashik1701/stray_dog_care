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
    let message = e.message || 'NLP analyze failed';
    
    // Provide better error messages
    if (e.code === 'NLP_CIRCUIT_OPEN' || e.serviceUnavailable) {
      message = 'NLP service is currently unavailable. Please ensure the NLP service is running.';
    } else if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
      message = 'Cannot connect to NLP service. The service may not be running.';
    }
    
    return res.status(status).json({ success: false, message, code: e.code });
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

// POST /api/nlp/reset-circuit (for admins or development)
async function resetCircuit(req, res) {
  try {
    if (nlpService.resetCircuit) {
      nlpService.resetCircuit();
      const health = await nlpService.checkHealth?.();
      return res.json({ 
        success: true, 
        message: 'Circuit breaker reset',
        data: { 
          circuitOpen: false,
          serviceHealthy: !!health?.reachable 
        }
      });
    }
    return res.status(500).json({ success: false, message: 'Reset not available' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to reset circuit' });
  }
}

// GET /api/nlp/predict
async function predict(req, res) {
  try {
    const text = typeof req.query.text === 'string' ? req.query.text : 'This is a great day!';
    const result = await nlpService.predict(text);
    return res.json({ success: true, data: result });
  } catch (e) {
    const status = e?.response?.status || 500;
    const message = e.message || 'Predict failed';
    return res.status(status).json({ success: false, message });
  }
}

module.exports = {
  analyzeReport,
  getStatus,
  resetCircuit,
  predict,
  analyzeLimiter,
};
