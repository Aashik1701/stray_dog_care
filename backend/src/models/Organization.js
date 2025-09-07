const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  
  type: {
    type: String,
    enum: ['ngo', 'government', 'municipal', 'veterinary_clinic', 'abc_center'],
    required: true
  },
  
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Contact Information
  contact: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    website: String,
    address: {
      street: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India'
      }
    }
  },
  
  // Service Areas
  serviceAreas: [{
    zone: String,
    city: String,
    coverage: {
      type: String,
      enum: ['full', 'partial'],
      default: 'full'
    }
  }],
  
  // Capacity and Resources
  capacity: {
    maxDogs: {
      type: Number,
      default: 0
    },
    currentDogs: {
      type: Number,
      default: 0
    },
    veterinarians: {
      type: Number,
      default: 0
    },
    fieldWorkers: {
      type: Number,
      default: 0
    }
  },
  
  // Services Offered
  services: [{
    type: String,
    enum: [
      'sterilization',
      'vaccination',
      'treatment',
      'adoption',
      'rescue',
      'feeding',
      'health_checkup',
      'emergency_care'
    ]
  }],
  
  // Statistics
  statistics: {
    dogsRegistered: {
      type: Number,
      default: 0
    },
    dogsSterilized: {
      type: Number,
      default: 0
    },
    dogsVaccinated: {
      type: Number,
      default: 0
    },
    dogsAdopted: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    }
  },
  
  // Financial Information
  budget: {
    annual: Number,
    allocated: Number,
    spent: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  
  // Certification and Compliance
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    documentUrl: String
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Partnerships
  partners: [{
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    partnershipType: {
      type: String,
      enum: ['funding', 'service', 'resource_sharing', 'collaboration'],
      required: true
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Settings
  settings: {
    allowPublicView: {
      type: Boolean,
      default: true
    },
    autoApproveVolunteers: {
      type: Boolean,
      default: false
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  
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
organizationSchema.index({ name: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ isActive: 1 });
organizationSchema.index({ 'serviceAreas.zone': 1 });

// Pre-save middleware to update timestamp
organizationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for capacity utilization percentage
organizationSchema.virtual('capacityUtilization').get(function() {
  if (this.capacity.maxDogs === 0) return 0;
  return Math.round((this.capacity.currentDogs / this.capacity.maxDogs) * 100);
});

// Instance method to update statistics
organizationSchema.methods.updateStatistics = function(field, value = 1) {
  if (this.statistics[field] !== undefined) {
    this.statistics[field] += value;
  }
  return this.save();
};

// Instance method to check if organization serves a zone
organizationSchema.methods.servesZone = function(zone) {
  return this.serviceAreas.some(area => area.zone === zone);
};

// Static method to find organizations by service
organizationSchema.statics.findByService = function(service) {
  return this.find({ 
    services: service, 
    isActive: true 
  });
};

// Static method to find organizations in zone
organizationSchema.statics.findInZone = function(zone) {
  return this.find({
    'serviceAreas.zone': zone,
    isActive: true
  });
};

module.exports = mongoose.model('Organization', organizationSchema);
