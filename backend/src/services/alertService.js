const Alert = require('../models/Alert');
const User = require('../models/User');
const Dog = require('../models/Dog');

/**
 * Dynamic Alerting Pipeline Service
 * 
 * This service implements operational intelligence techniques for:
 * - Real-time sentiment and urgency analysis
 * - Intelligent alert routing based on proximity, zone, and availability
 * - Automatic escalation for unacknowledged critical cases
 * - Response time tracking and analytics
 */

/**
 * Create and dispatch an alert from NLP analysis results
 * @param {Object} dog - Dog document
 * @param {Object} nlpAnalysis - NLP analysis results
 * @param {Object} io - Socket.io instance
 * @returns {Promise<Object>} Created alert
 */
async function createAlertFromNLP(dog, nlpAnalysis, io) {
  try {
    // Extract urgency and priority from NLP analysis
    const urgencyScore = nlpAnalysis.urgency_score || nlpAnalysis.urgency || 0;
    const priority = determinePriority(urgencyScore);
    
    // Determine alert type from category
    const alertType = mapCategoryToAlertType(nlpAnalysis.category);
    
    // Generate alert title and message
    const { title, message } = generateAlertContent(dog, nlpAnalysis, urgencyScore);
    
    // Create alert document
    const alertData = {
      dog: dog._id,
      type: alertType,
      priority,
      urgencyScore,
      nlpAnalysis: {
        category: nlpAnalysis.category,
        confidence: nlpAnalysis.confidence,
        sentiment: nlpAnalysis.sentiment,
        summary: nlpAnalysis.summary,
        extractedEntities: nlpAnalysis.entities || nlpAnalysis.extractedEntities || {}
      },
      title,
      message,
      location: dog.location,
      zone: dog.zone,
      address: dog.address?.area || dog.address?.street || dog.address,
      organization: dog.organization,
      reportedBy: dog.reportedBy,
      status: 'pending',
      metadata: {
        source: 'nlp_auto',
        autoFlagged: true,
        tags: extractTags(dog, nlpAnalysis)
      }
    };

    const alert = new Alert(alertData);
    await alert.save();

    // Populate references for Socket.io broadcast
    await alert.populate([
      { path: 'dog', select: 'dogId name size color images' },
      { path: 'reportedBy', select: 'username profile.firstName profile.lastName' },
      { path: 'organization', select: 'name type' }
    ]);

    // Intelligent routing: Find best recipients
    const recipients = await findAlertRecipients(alert, dog);

    // Broadcast via Socket.io with smart routing
    if (io) {
      broadcastAlert(alert, recipients, io);
    }

    // Update notification tracking
    alert.notificationsSent.socket = true;
    alert.notificationTimestamps.socket = new Date();
    await alert.save();

    console.log(`[Alert Service] Alert ${alert.alertId} created for ${dog.dogId} (Priority: ${priority}, Urgency: ${urgencyScore.toFixed(2)})`);
    
    return alert;
  } catch (error) {
    console.error('[Alert Service] Error creating alert:', error);
    throw error;
  }
}

/**
 * Determine priority level from urgency score
 * @param {Number} urgencyScore - Urgency score (0.0 - 1.0)
 * @returns {String} Priority level
 */
function determinePriority(urgencyScore) {
  if (urgencyScore >= 0.85) return 'critical';
  if (urgencyScore >= 0.7) return 'high';
  if (urgencyScore >= 0.4) return 'normal';
  return 'low';
}

/**
 * Map NLP category to alert type
 * @param {String} category - NLP classification category
 * @returns {String} Alert type
 */
function mapCategoryToAlertType(category) {
  const categoryMap = {
    'bite incident': 'bite',
    'injury case': 'injury',
    'cruelty report': 'cruelty',
    'health concern': 'health_concern',
    'adoption request': 'high_priority',
    'general sighting': 'high_priority'
  };
  
  return categoryMap[category] || 'high_priority';
}

/**
 * Generate alert title and message from dog and NLP data
 * @param {Object} dog - Dog document
 * @param {Object} nlpAnalysis - NLP analysis
 * @param {Number} urgencyScore - Urgency score
 * @returns {Object} { title, message }
 */
function generateAlertContent(dog, nlpAnalysis, urgencyScore) {
  const location = dog.zone || dog.address?.area || 'Unknown location';
  const dogInfo = dog.name || dog.dogId || 'Dog';
  
  // Generate title based on urgency and category
  let title;
  if (urgencyScore >= 0.85) {
    title = `🚨 CRITICAL: ${nlpAnalysis.category} in ${location}`;
  } else if (urgencyScore >= 0.7) {
    title = `⚠️ URGENT: ${nlpAnalysis.category} in ${location}`;
  } else {
    title = `${nlpAnalysis.category} reported in ${location}`;
  }

  // Generate message with context
  let message = `${dogInfo} reported in ${location}. `;
  
  if (nlpAnalysis.summary) {
    message += nlpAnalysis.summary;
  } else if (dog.healthStatus?.notes) {
    message += dog.healthStatus.notes.substring(0, 150);
  }

  // Add extracted symptoms if available
  const entities = nlpAnalysis.entities || nlpAnalysis.extractedEntities || {};
  if (entities.symptoms && entities.symptoms.length > 0) {
    message += ` Symptoms: ${entities.symptoms.join(', ')}.`;
  }

  return { title, message };
}

/**
 * Extract tags for alert metadata
 * @param {Object} dog - Dog document
 * @param {Object} nlpAnalysis - NLP analysis
 * @returns {Array} Tags array
 */
function extractTags(dog, nlpAnalysis) {
  const tags = [];
  
  if (nlpAnalysis.sentiment === 'negative') tags.push('negative_sentiment');
  if (dog.healthStatus?.isInjured) tags.push('injured');
  if (dog.behavior?.isAggressive) tags.push('aggressive');
  
  const entities = nlpAnalysis.entities || nlpAnalysis.extractedEntities || {};
  if (entities.symptoms) {
    entities.symptoms.forEach(symptom => {
      tags.push(`symptom_${symptom.toLowerCase().replace(/\s+/g, '_')}`);
    });
  }
  
  return tags;
}

/**
 * Find best recipients for alert based on proximity, zone, and availability
 * @param {Object} alert - Alert document
 * @param {Object} dog - Dog document
 * @returns {Promise<Array>} Array of user IDs and routing info
 */
async function findAlertRecipients(alert, dog) {
  try {
    const recipients = {
      organization: [],
      zone: [],
      proximity: [],
      coordinators: []
    };

    // 1. Organization members (same org)
    if (dog.organization) {
      const orgMembers = await User.find({
        organization: dog.organization,
        isActive: true,
        role: { $in: ['field_worker', 'ngo_coordinator', 'veterinarian'] }
      }).select('_id username profile role assignedZones');
      
      recipients.organization = orgMembers.map(u => u._id.toString());
    }

    // 2. Zone-specific workers
    if (dog.zone) {
      const zoneWorkers = await User.find({
        assignedZones: dog.zone,
        isActive: true,
        role: { $in: ['field_worker', 'ngo_coordinator'] }
      }).select('_id username profile role');
      
      recipients.zone = zoneWorkers.map(u => u._id.toString());
    }

    // 3. Coordinators and admins (for critical cases)
    if (alert.priority === 'critical' || alert.urgencyScore >= 0.85) {
      const coordinators = await User.find({
        organization: dog.organization,
        isActive: true,
        role: { $in: ['ngo_coordinator', 'municipal_admin', 'system_admin'] }
      }).select('_id username profile role');
      
      recipients.coordinators = coordinators.map(u => u._id.toString());
    }

    // 4. Proximity-based routing (for future enhancement with GPS)
    // This would require real-time location tracking of field workers
    // For now, we prioritize zone and organization members

    // Combine and deduplicate
    const allRecipients = [
      ...new Set([
        ...recipients.organization,
        ...recipients.zone,
        ...recipients.coordinators
      ])
    ];

    return {
      userIds: allRecipients,
      routing: recipients,
      totalCount: allRecipients.length
    };
  } catch (error) {
    console.error('[Alert Service] Error finding recipients:', error);
    return { userIds: [], routing: {}, totalCount: 0 };
  }
}

/**
 * Broadcast alert via Socket.io with intelligent routing
 * @param {Object} alert - Alert document (populated)
 * @param {Object} recipients - Recipients object
 * @param {Object} io - Socket.io instance
 */
function broadcastAlert(alert, recipients, io) {
  const alertPayload = {
    alertId: alert.alertId,
    dog: {
      id: alert.dog._id,
      dogId: alert.dog.dogId,
      name: alert.dog.name,
      images: alert.dog.images || []
    },
    type: alert.type,
    priority: alert.priority,
    urgencyScore: alert.urgencyScore,
    title: alert.title,
    message: alert.message,
    location: {
      coordinates: alert.location.coordinates,
      zone: alert.zone,
      address: alert.address
    },
    nlpAnalysis: alert.nlpAnalysis,
    reportedBy: {
      id: alert.reportedBy._id,
      name: `${alert.reportedBy.profile?.firstName || ''} ${alert.reportedBy.profile?.lastName || ''}`.trim()
    },
    organization: alert.organization,
    createdAt: alert.createdAt,
    status: alert.status,
    metadata: alert.metadata
  };

  // Broadcast to organization room
  if (alert.organization) {
    io.to(`org-${alert.organization._id || alert.organization}`).emit('alert.new', alertPayload);
  }

  // Broadcast critical/urgent alerts more broadly
  if (alert.priority === 'critical' || alert.urgencyScore >= 0.85) {
    io.emit('alert.critical', alertPayload);
    console.log(`[Alert Service] Critical alert ${alert.alertId} broadcasted globally`);
  } else if (alert.priority === 'high' || alert.urgencyScore >= 0.7) {
    io.emit('alert.high_priority', alertPayload);
    console.log(`[Alert Service] High priority alert ${alert.alertId} broadcasted`);
  }

  // Emit to specific zone room if available
  if (alert.zone) {
    io.to(`zone-${alert.zone}`).emit('alert.zone', alertPayload);
  }
}

/**
 * Check for unacknowledged alerts and escalate if needed
 * @param {Object} io - Socket.io instance
 */
async function checkAndEscalateAlerts(io) {
  try {
    const now = new Date();
    const escalationThresholds = {
      critical: 5 * 60 * 1000, // 5 minutes for critical
      high: 15 * 60 * 1000,    // 15 minutes for high
      normal: 30 * 60 * 1000   // 30 minutes for normal
    };

    // Find unacknowledged alerts that need escalation
    const alerts = await Alert.find({
      status: 'pending',
      escalationLevel: { $lt: 3 }
    }).populate('organization');

    for (const alert of alerts) {
      const age = now.getTime() - alert.createdAt.getTime();
      const threshold = escalationThresholds[alert.priority] || escalationThresholds.normal;

      if (age > threshold) {
        const newEscalationLevel = alert.escalationLevel + 1;
        
        // Find coordinators for escalation
        const coordinators = await User.find({
          organization: alert.organization,
          role: { $in: ['ngo_coordinator', 'municipal_admin', 'system_admin'] },
          isActive: true
        }).limit(1);

        if (coordinators.length > 0) {
          await alert.escalate(coordinators[0]._id, newEscalationLevel);
          
          // Broadcast escalation
          if (io) {
            io.to(`org-${alert.organization._id || alert.organization}`).emit('alert.escalated', {
              alertId: alert.alertId,
              escalationLevel: newEscalationLevel,
              escalatedTo: coordinators[0]._id,
              escalatedAt: alert.escalatedAt
            });
          }

          console.log(`[Alert Service] Alert ${alert.alertId} escalated to level ${newEscalationLevel}`);
        }
      }
    }
  } catch (error) {
    console.error('[Alert Service] Error in escalation check:', error);
  }
}

/**
 * Get alerts for a user/organization with filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Alerts array
 */
async function getAlerts(filters = {}) {
  try {
    const query = {};

    if (filters.organization) {
      query.organization = filters.organization;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.zone) {
      query.zone = filters.zone;
    }

    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }

    if (filters.minUrgency) {
      query.urgencyScore = { $gte: filters.minUrgency };
    }

    const alerts = await Alert.find(query)
      .populate('dog', 'dogId name size color images')
      .populate('reportedBy', 'username profile.firstName profile.lastName')
      .populate('organization', 'name type')
      .populate('assignedTo', 'username profile.firstName profile.lastName')
      .sort({ urgencyScore: -1, createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.skip || 0);

    return alerts;
  } catch (error) {
    console.error('[Alert Service] Error getting alerts:', error);
    throw error;
  }
}

module.exports = {
  createAlertFromNLP,
  findAlertRecipients,
  broadcastAlert,
  checkAndEscalateAlerts,
  getAlerts,
  determinePriority
};

