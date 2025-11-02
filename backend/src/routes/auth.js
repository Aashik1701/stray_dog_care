const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout,
  refreshToken,
  checkAvailability,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/availability', checkAvailability);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/change-password', changePassword);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

module.exports = router;
