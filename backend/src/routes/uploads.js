const express = require('express');
const { auth } = require('../middleware/auth');
const { upload, uploadImages } = require('../controllers/uploadController');

const router = express.Router();

// Authenticated image uploads
router.post('/images', auth, upload.array('images', 5), uploadImages);

module.exports = router;
