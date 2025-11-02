const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role = 'field_worker',
      organizationId
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!username) missing.push('username');
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (!firstName) missing.push('firstName');
    if (!lastName) missing.push('lastName');
    if (!phoneNumber) missing.push('phoneNumber');
    if (missing.length) {
      return res.status(400).json({ success: false, message: 'All fields are required', missing });
    }

    // Normalize inputs
    const normalizedPhone = String(phoneNumber).replace(/\D/g, '');
    const normalizedEmail = String(email).toLowerCase().trim();
    const trimmedUsername = String(username).trim();

    // Additional validations (mirror schema to give clearer errors)
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email' });
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit phone number' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: trimmedUsername }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user
    const userData = {
      username: trimmedUsername,
      email: normalizedEmail,
      password,
      profile: {
        firstName,
        lastName,
        phoneNumber: normalizedPhone
      },
      role
    };

    // Add organization if provided
    if (organizationId) {
      userData.organization = organizationId;
    }

    // Set default permissions based on role
    const rolePermissions = {
      field_worker: ['create_dog', 'edit_dog'],
      ngo_coordinator: ['create_dog', 'edit_dog', 'view_analytics', 'manage_users'],
      municipal_admin: ['create_dog', 'edit_dog', 'delete_dog', 'view_analytics', 'manage_users', 'export_data'],
      veterinarian: ['create_dog', 'edit_dog', 'view_analytics'],
      system_admin: ['system_admin']
    };

    userData.permissions = rolePermissions[role] || rolePermissions.field_worker;

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  try {
    const { email, password, ipAddress, userAgent } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    }).populate('organization', 'name type');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Add login history
    await user.addLoginHistory(
      ipAddress || req.ip,
      userAgent || req.get('User-Agent')
    );

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.loginHistory;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('organization', 'name type contact')
      .select('-password -loginHistory');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  try {
    const allowedUpdates = [
      'profile.firstName',
      'profile.lastName',
      'profile.phoneNumber',
      'settings'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) || key.startsWith('profile.') || key.startsWith('settings.')) {
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          if (!updates[parent]) updates[parent] = {};
          updates[parent][child] = req.body[key];
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('organization', 'name type contact')
     .select('-password -loginHistory');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // You could implement token blacklisting here if needed
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = asyncHandler(async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user._id);

    res.json({
      success: true,
      data: {
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: error.message
    });
  }
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout,
  refreshToken,
  // Check availability for username/email
  checkAvailability: asyncHandler(async (req, res) => {
    try {
      const { username, email } = req.query;
      const result = { username: undefined, email: undefined };

      if (username) {
        const existingUsername = await User.findOne({ username: String(username).trim() });
        result.username = !existingUsername;
      }
      if (email) {
        const existingEmail = await User.findOne({ email: String(email).toLowerCase().trim() });
        result.email = !existingEmail;
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error checking availability', error: error.message });
    }
  }),
  // Request password reset
  forgotPassword: asyncHandler(async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }
      const normalizedEmail = String(email).toLowerCase().trim();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // Do not leak user existence
        return res.json({ success: true, message: 'If an account exists, a reset link has been sent' });
      }

      // Generate simple reset token (could be crypto randomBytes + hash)
      const token = require('crypto').randomBytes(24).toString('hex');
      user.passwordResetToken = token;
      user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
      await user.save();

      // In production, send email; in development, return token for convenience
      const resp = { success: true, message: 'Password reset requested' };
      if (process.env.NODE_ENV !== 'production') {
        resp.token = token;
        resp.expiresAt = user.passwordResetExpires;
      }
      return res.json(resp);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error requesting password reset', error: error.message });
    }
  }),
  // Reset password using token
  resetPassword: asyncHandler(async (req, res) => {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and newPassword are required' });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }

      const user = await User.findOne({ passwordResetToken: token });
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
    }
  })
};
