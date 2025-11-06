const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createReport, listReports, getReportById } = require('../controllers/reportController');

// Create a new report from text or audioUrl
router.post('/', auth, createReport);

// List reports
router.get('/', auth, listReports);

// Get report by id
router.get('/:id', auth, getReportById);

module.exports = router;
