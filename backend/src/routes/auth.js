const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout,
  refreshToken
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/change-password', changePassword);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

module.exports = router;
