const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (require manage_users permission)
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      role,
      isActive,
      search,
      organization
    } = req.query;

    // Build filter object
    const filter = {};

    // Role filter
    if (role) {
      filter.role = role;
    }

    // Active status filter
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Organization filter (for non-admin users)
    if (req.user.role !== 'system_admin' && req.user.role !== 'municipal_admin') {
      filter.organization = req.user.organization;
    } else if (organization) {
      filter.organization = organization;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(filter)
      .populate('organization', 'name type')
      .select('-password -loginHistory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('organization', 'name type contact')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can access this profile
    const canAccess = req.user.role === 'system_admin' ||
                     req.user.role === 'municipal_admin' ||
                     req.user._id.toString() === id ||
                     (req.user.organization && user.organization && 
                      req.user.organization.toString() === user.organization._id.toString());

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// @desc    Update user status (activate/deactivate)
// @route   PATCH /api/users/:id/status
// @access  Private (require manage_users permission)
const updateUserStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Prevent deactivating self
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify your own account status'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    ).populate('organization', 'name type').select('-password -loginHistory');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
});

// @desc    Update user role
// @route   PATCH /api/users/:id/role
// @access  Private (require manage_users permission)
const updateUserRole = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['field_worker', 'ngo_coordinator', 'municipal_admin', 'veterinarian', 'system_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Prevent modifying self
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify your own role'
      });
    }

    // Set permissions based on role
    const rolePermissions = {
      field_worker: ['create_dog', 'edit_dog'],
      ngo_coordinator: ['create_dog', 'edit_dog', 'view_analytics', 'manage_users'],
      municipal_admin: ['create_dog', 'edit_dog', 'delete_dog', 'view_analytics', 'manage_users', 'export_data'],
      veterinarian: ['create_dog', 'edit_dog', 'view_analytics'],
      system_admin: ['system_admin']
    };

    const user = await User.findByIdAndUpdate(
      id,
      { 
        role,
        permissions: rolePermissions[role] || rolePermissions.field_worker
      },
      { new: true, runValidators: true }
    ).populate('organization', 'name type').select('-password -loginHistory');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (require view_analytics permission)
const getUserStats = asyncHandler(async (req, res) => {
  try {
    // Build filter for organization-based access
    const orgFilter = {};
    if (req.user.role !== 'system_admin' && req.user.role !== 'municipal_admin') {
      orgFilter.organization = req.user.organization;
    }

    // Get role distribution
    const roleStats = await User.aggregate([
      { $match: orgFilter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: ['$isActive', 1, 0]
            }
          }
        }
      }
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await User.countDocuments({
      ...orgFilter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsers = await User.countDocuments({
      ...orgFilter,
      lastLogin: { $gte: sevenDaysAgo },
      isActive: true
    });

    // Get total counts
    const totalUsers = await User.countDocuments(orgFilter);
    const activeUserCount = await User.countDocuments({ ...orgFilter, isActive: true });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUserCount,
        inactive: totalUsers - activeUserCount,
        recentRegistrations,
        recentlyActive: activeUsers,
        roleDistribution: roleStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: error.message
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (system_admin only)
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  getUserStats,
  deleteUser
};
