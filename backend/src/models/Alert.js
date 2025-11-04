const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  // Alert identification
  alertId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      const date = new Date();
      const timestamp = date.getTime();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ALERT_${timestamp}_${random}`;
    }
  },

  // Associated dog case
  dog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dog',
    required: true
  },

  // Alert type and classification
  type: {
    type: String,
    enum: ['emergency', 'high_priority', 'urgent', 'injury', 'bite', 'cruelty', 'health_concern'],
    required: true
  },

  // Priority level (auto-calculated from NLP urgency)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    required: true,
    default: 'normal'
  },

  // Urgency score from NLP analysis (0.0 - 1.0)
  urgencyScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },

  // NLP analysis metadata
  nlpAnalysis: {
    category: String,
    confidence: Number,
    sentiment: String, // positive|negative
    summary: String,
    extractedEntities: {
      locations: [String],
      symptoms: [String]
    }
  },

  // Alert content
  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  // Location information
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

  zone: {
    type: String,
    required: true
  },

  address: String,

  // Organization context
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Reporter information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Alert status tracking
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'cancelled'],
    default: 'pending'
  },

  // Acknowledgment tracking
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  acknowledgedAt: Date,

  // Assignment tracking
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  assignedAt: Date,

  // Resolution tracking
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  resolvedAt: Date,

  resolutionNotes: String,

  // Escalation tracking
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3 // 0 = no escalation, 1-3 = escalation levels
  },

  escalatedAt: Date,

  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notification tracking
  notificationsSent: {
    socket: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  },

  notificationTimestamps: {
    socket: Date,
    push: Date,
    sms: Date,
    email: Date
  },

  // Response time tracking (for operational intelligence)
  responseTime: {
    acknowledged: Number, // milliseconds from creation to acknowledgment
    assigned: Number, // milliseconds from creation to assignment
    resolved: Number // milliseconds from creation to resolution
  },

  // Alert metadata
  metadata: {
    source: {
      type: String,
      enum: ['nlp_auto', 'manual', 'system'],
      default: 'nlp_auto'
    },
    autoFlagged: {
      type: Boolean,
      default: true
    },
    tags: [String]
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
alertSchema.index({ status: 1, priority: -1, createdAt: -1 });
alertSchema.index({ organization: 1, status: 1 });
alertSchema.index({ zone: 1, status: 1 });
alertSchema.index({ assignedTo: 1, status: 1 });
alertSchema.index({ urgencyScore: -1, createdAt: -1 });
alertSchema.index({ location: '2dsphere' });

// Pre-save middleware to update response times
alertSchema.pre('save', function(next) {
  if (this.isModified('acknowledgedAt') && this.acknowledgedAt && this.createdAt) {
    this.responseTime.acknowledged = this.acknowledgedAt.getTime() - this.createdAt.getTime();
  }
  if (this.isModified('assignedAt') && this.assignedAt && this.createdAt) {
    this.responseTime.assigned = this.assignedAt.getTime() - this.createdAt.getTime();
  }
  if (this.isModified('resolvedAt') && this.resolvedAt && this.createdAt) {
    this.responseTime.resolved = this.resolvedAt.getTime() - this.createdAt.getTime();
  }
  this.updatedAt = new Date();
  next();
});

// Instance method to acknowledge alert
alertSchema.methods.acknowledge = async function(userId) {
  this.status = 'acknowledged';
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  return this.save();
};

// Instance method to assign alert
alertSchema.methods.assign = async function(userId, assigneeId) {
  this.status = 'in_progress';
  this.assignedTo = assigneeId;
  this.assignedAt = new Date();
  if (!this.acknowledgedBy) {
    this.acknowledgedBy = userId;
    this.acknowledgedAt = new Date();
  }
  return this.save();
};

// Instance method to resolve alert
alertSchema.methods.resolve = async function(userId, notes) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  if (notes) {
    this.resolutionNotes = notes;
  }
  return this.save();
};

// Instance method to escalate alert
alertSchema.methods.escalate = async function(userId, escalationLevel = 1) {
  this.status = 'escalated';
  this.escalationLevel = Math.min(escalationLevel, 3);
  this.escalatedTo = userId;
  this.escalatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Alert', alertSchema);

