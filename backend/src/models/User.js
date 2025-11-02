const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // Allow modern TLDs and multi-part domains (e.g., .info, .digital, .co.in)
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Personal Information
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    avatar: {
      url: String,
      publicId: String
    }
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['field_worker', 'ngo_coordinator', 'municipal_admin', 'veterinarian', 'system_admin'],
    required: true,
    default: 'field_worker'
  },
  
  permissions: [{
    type: String,
    enum: [
      'create_dog',
      'edit_dog',
      'delete_dog',
      'view_analytics',
      'manage_users',
      'manage_organization',
      'export_data',
      'system_admin'
    ]
  }],
  
  // Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  
  // Work Area
  assignedZones: [{
    type: String
  }],
  
  // Activity Statistics
  statistics: {
    dogsRegistered: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    totalLoginHours: {
      type: Number,
      default: 0
    },
    efficiencyRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Authentication Tokens
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Settings
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  
  // Login tracking
  lastLogin: Date,
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ organization: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with salt rounds of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to update statistics
userSchema.methods.updateStatistics = function(field, value = 1) {
  if (this.statistics[field] !== undefined) {
    if (typeof this.statistics[field] === 'number') {
      this.statistics[field] += value;
    } else {
      this.statistics[field] = value;
    }
  }
  this.statistics.lastActive = new Date();
  return this.save();
};

// Instance method to check permissions
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === 'system_admin';
};

// Instance method to add login history
userSchema.methods.addLoginHistory = function(ipAddress, userAgent) {
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress,
    userAgent
  });
  
  // Keep only last 10 login records
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(-10);
  }
  
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to get user statistics
userSchema.statics.getUserStatistics = function() {
  return this.aggregate([
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
};

module.exports = mongoose.model('User', userSchema);
