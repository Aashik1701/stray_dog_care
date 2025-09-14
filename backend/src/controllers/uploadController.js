const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { asyncHandler } = require('../middleware/errorHandler');

// Multer setup: memory storage for direct buffer upload to Cloudinary
const storage = multer.memoryStorage();

const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    if (allowedMime.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only images are allowed (jpeg, png, webp, heic/heif)'));
  }
});

// Convert buffer to data URI for Cloudinary upload
function bufferToDataUri(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const mime = file.mimetype || 'image/jpeg';
  const base64 = file.buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
}

// POST /api/uploads/images
const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const types = Array.isArray(req.body.types) ? req.body.types : (req.body.types ? [req.body.types] : []);

  if (!files.length) {
    return res.status(400).json({ success: false, message: 'No files provided' });
  }

  const folder = process.env.CLOUDINARY_FOLDER || 'stray_dog_care/dogs';

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const type = types[i] || 'other';
    const dataUri = bufferToDataUri(file);

    // Upload to Cloudinary
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    results.push({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      type,
      uploadedAt: new Date()
    });
  }

  res.json({ success: true, data: results });
});

module.exports = {
  upload,
  uploadImages
};
