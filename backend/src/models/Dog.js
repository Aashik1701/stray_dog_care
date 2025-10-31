const mongoose = require('mongoose');

const dogSchema = new mongoose.Schema({
  dogId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      const date = new Date();
      const year = date.getFullYear();
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      return `DOG_${year}_${random}`;
    }
  },
  
  // Basic Information
  name: {
    type: String,
    default: 'Unnamed'
  },
  
  // Physical Characteristics
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    required: true
  },
  
  color: {
    type: String,
    default: 'unknown'
  },
  
  breed: {
    type: String,
    default: 'mixed'
  },
  
  gender: {
    type: String,
    enum: ['male', 'female', 'unknown'],
    default: 'unknown'
  },
  
  estimatedAge: {
    type: String,
    enum: ['puppy', 'young', 'adult', 'senior', 'unknown'],
    default: 'unknown'
  },
  
  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
  
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  
  zone: {
    type: String,
    required: true
  },
  
  // Health Status
  healthStatus: {
    isHealthy: {
      type: Boolean,
      default: true
    },
    isInjured: {
      type: Boolean,
      default: false
    },
    injuryDescription: String,
    isVaccinated: {
      type: Boolean,
      default: false
    },
    vaccinationDate: Date,
    isSterilized: {
      type: Boolean,
      default: false
    },
    sterilizationDate: Date,
    lastHealthCheck: Date,
    // Original free text and NLP-enriched analysis
    notes: String,
    nlpAnalysis: {
      category: String, // e.g., injury case, adoption request
      confidence: Number,
      sentiment: String, // positive|neutral|negative
      urgency: Number, // 0..1
      summary: String,
      extractedEntities: {
        breeds: [String],
        locations: [String],
        symptoms: [String],
        dates: [String]
      }
    }
  },
  
  // Behavioral Information
  behavior: {
    isAggressive: {
      type: Boolean,
      default: false
    },
    isFriendly: {
      type: Boolean,
      default: true
    },
    fearLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String, // Cloudinary public ID
    type: {
      type: String,
      enum: ['face', 'body', 'injury', 'other'],
      default: 'other'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Medical Records
  medicalHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['vaccination', 'treatment', 'checkup', 'surgery', 'sterilization'],
      required: true
    },
    description: String,
    veterinarian: String,
    medications: [String],
    notes: String,
    cost: Number,
    nextAppointment: Date
  }],
  
  // Status Tracking
  status: {
    type: String,
    enum: ['active', 'adopted', 'deceased', 'relocated', 'missing'],
    default: 'active'
  },
  
  adoptionStatus: {
    type: String,
    enum: ['not_available', 'available', 'pending', 'adopted'],
    default: 'not_available'
  },
  
  // Registration Information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  
  // Activity Log
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],

  // Structured status / health change history (immutable audit trail)
  history: [{
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: [{
      field: String,
      from: mongoose.Schema.Types.Mixed,
      to: mongoose.Schema.Types.Mixed
    }],
    note: String
  }],
  
  // Notes and Comments
  notes: String,

  // NLP-related transcription info (for voice reports)
  transcription: {
    originalLanguage: String,
    transcribedText: String,
    confidence: Number
  },

  // Priority derived from NLP urgency or manual assignment
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
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

// Indexes for better performance
dogSchema.index({ 'location.coordinates': '2dsphere' });
dogSchema.index({ dogId: 1 });
dogSchema.index({ reportedBy: 1 });
dogSchema.index({ createdAt: -1 });
dogSchema.index({ zone: 1 });
dogSchema.index({ status: 1 });
dogSchema.index({ 'healthStatus.isSterilized': 1 });
dogSchema.index({ 'healthStatus.isVaccinated': 1 });

// Pre-save middleware to update timestamp
dogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add activity log entry
dogSchema.methods.addActivity = function(action, performedBy, details = '') {
  this.activityLog.push({
    action,
    performedBy,
    details,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to find dogs near a location
dogSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Static method to get statistics
dogSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sterilized: {
          $sum: {
            $cond: ['$healthStatus.isSterilized', 1, 0]
          }
        },
        vaccinated: {
          $sum: {
            $cond: ['$healthStatus.isVaccinated', 1, 0]
          }
        },
        injured: {
          $sum: {
            $cond: ['$healthStatus.isInjured', 1, 0]
          }
        },
        adopted: {
          $sum: {
            $cond: [{ $eq: ['$status', 'adopted'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Dog', dogSchema);
