const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getUserStats,
  deleteUser
} = require('../controllers/userController');
const { auth, authorize, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// Get user statistics (analytics permission required)
router.get('/stats', requirePermission('view_analytics'), getUserStats);

// Get all users (manage_users permission required)
router.get('/', requirePermission('manage_users'), getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user status (manage_users permission required)
router.patch('/:id/status', requirePermission('manage_users'), updateUserStatus);

// Update user role (manage_users permission required)
router.patch('/:id/role', requirePermission('manage_users'), updateUserRole);

// Delete user (system_admin only)
router.delete('/:id', authorize('system_admin'), deleteUser);

module.exports = router;
