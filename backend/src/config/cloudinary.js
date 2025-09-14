const cloudinary = require('cloudinary').v2;

// Ensure required environment variables are present
const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = requiredEnv.filter((k) => !process.env[k]);

if (missing.length) {
  console.warn(`⚠️ Cloudinary env missing: ${missing.join(', ')}. Image uploads will fail until configured.`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
