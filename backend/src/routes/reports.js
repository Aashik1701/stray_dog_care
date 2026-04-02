const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, requirePermission } = require('../middleware/auth');
const { createReport, listReports, getReportById, getReportsAnalytics } = require('../controllers/reportController');

const reportAudioUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 20 * 1024 * 1024 },
});

// Create a new report from text, audio upload, or audioUrl
router.post('/', auth, reportAudioUpload.single('audio'), createReport);

// List reports
router.get('/', auth, listReports);

// Analytics (requires view_analytics permission)
router.get('/analytics/summary', auth, requirePermission('view_analytics'), getReportsAnalytics);

// Get report by id
router.get('/:id', auth, getReportById);

module.exports = router;
