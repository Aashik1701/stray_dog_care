const express = require('express');
const router = express.Router();
const { auth, requirePermission } = require('../middleware/auth');
const { createReport, listReports, getReportById, getReportsAnalytics } = require('../controllers/reportController');

// Create a new report from text or audioUrl
router.post('/', auth, createReport);

// List reports
router.get('/', auth, listReports);

// Get report by id
router.get('/:id', auth, getReportById);

// Analytics (requires view_analytics permission)
router.get('/analytics/summary', auth, requirePermission('view_analytics'), getReportsAnalytics);

module.exports = router;
