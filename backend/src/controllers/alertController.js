const Alert = require('../models/Alert');
const { asyncHandler } = require('../middleware/errorHandler');
const alertService = require('../services/alertService');

// @desc    Get all alerts with filtering
// @route   GET /api/alerts
// @access  Private
const getAlerts = asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    zone,
    assignedTo,
    minUrgency,
    limit = 50,
    skip = 0
  } = req.query;

  const filters = {
    organization: req.user.organization,
    status,
    priority,
    zone,
    assignedTo,
    minUrgency: minUrgency ? parseFloat(minUrgency) : undefined,
    limit: parseInt(limit),
    skip: parseInt(skip)
  };

  const alerts = await alertService.getAlerts(filters);

  res.json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});

// @desc    Get alert by ID
// @route   GET /api/alerts/:id
// @access  Private
const getAlertById = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id)
    .populate('dog', 'dogId name size color images location zone')
    .populate('reportedBy', 'username profile.firstName profile.lastName')
    .populate('organization', 'name type')
    .populate('assignedTo', 'username profile.firstName profile.lastName')
    .populate('acknowledgedBy', 'username profile.firstName profile.lastName');

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  // Check organization access
  if (alert.organization.toString() !== req.user.organization.toString() &&
      req.user.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: alert
  });
});

// @desc    Acknowledge alert
// @route   POST /api/alerts/:id/acknowledge
// @access  Private
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  // Check organization access
  if (alert.organization.toString() !== req.user.organization.toString() &&
      req.user.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await alert.acknowledge(req.user._id);

  // Broadcast acknowledgment
  const io = req.app.get('io');
  if (io) {
    io.to(`org-${alert.organization}`).emit('alert.acknowledged', {
      alertId: alert.alertId,
      acknowledgedBy: req.user._id,
      acknowledgedAt: alert.acknowledgedAt
    });
  }

  res.json({
    success: true,
    message: 'Alert acknowledged',
    data: alert
  });
});

// @desc    Assign alert to user
// @route   POST /api/alerts/:id/assign
// @access  Private
const assignAlert = asyncHandler(async (req, res) => {
  const { assigneeId } = req.body;

  if (!assigneeId) {
    return res.status(400).json({
      success: false,
      message: 'Assignee ID is required'
    });
  }

  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  // Check organization access
  if (alert.organization.toString() !== req.user.organization.toString() &&
      req.user.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await alert.assign(req.user._id, assigneeId);

  // Broadcast assignment
  const io = req.app.get('io');
  if (io) {
    io.to(`org-${alert.organization}`).emit('alert.assigned', {
      alertId: alert.alertId,
      assignedTo: assigneeId,
      assignedAt: alert.assignedAt
    });
  }

  res.json({
    success: true,
    message: 'Alert assigned',
    data: alert
  });
});

// @desc    Resolve alert
// @route   POST /api/alerts/:id/resolve
// @access  Private
const resolveAlert = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  // Check organization access
  if (alert.organization.toString() !== req.user.organization.toString() &&
      req.user.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await alert.resolve(req.user._id, notes);

  // Broadcast resolution
  const io = req.app.get('io');
  if (io) {
    io.to(`org-${alert.organization}`).emit('alert.resolved', {
      alertId: alert.alertId,
      resolvedBy: req.user._id,
      resolvedAt: alert.resolvedAt,
      resolutionNotes: alert.resolutionNotes
    });
  }

  res.json({
    success: true,
    message: 'Alert resolved',
    data: alert
  });
});

// @desc    Get alert statistics
// @route   GET /api/alerts/stats
// @access  Private
const getAlertStats = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization;

  const stats = await Alert.aggregate([
    {
      $match: {
        organization: organizationId
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        acknowledged: {
          $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] }
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        critical: {
          $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
        },
        avgUrgency: { $avg: '$urgencyScore' },
        avgResponseTime: {
          $avg: '$responseTime.acknowledged'
        }
      }
    }
  ]);

  const result = stats[0] || {
    total: 0,
    pending: 0,
    acknowledged: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    avgUrgency: 0,
    avgResponseTime: 0
  };

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
  getAlertStats
};

