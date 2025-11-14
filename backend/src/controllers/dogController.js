const Dog = require('../models/Dog');
const User = require('../models/User');
const nlpService = require('../services/nlpService');
const { asyncHandler } = require('../middleware/errorHandler');
const { diffObjects } = require('../utils/diff');

// @desc    Get all dogs with filtering and pagination
// @route   GET /api/dogs
// @access  Public
const getAllDogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    zone,
    isVaccinated,
    isSterilized,
    isInjured,
    size,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const filter = {};
  
  if (status) filter.status = status;
  if (zone) filter.zone = zone;
  if (isVaccinated !== undefined) filter['healthStatus.isVaccinated'] = isVaccinated === 'true';
  if (isSterilized !== undefined) filter['healthStatus.isSterilized'] = isSterilized === 'true';
  if (isInjured !== undefined) filter['healthStatus.isInjured'] = isInjured === 'true';
  if (size) filter.size = size;

  // Text search
  if (search) {
    filter.$or = [
      { dogId: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { 'address.area': { $regex: search, $options: 'i' } },
      { 'address.landmark': { $regex: search, $options: 'i' } }
    ];
  }

  // Apply organization filter if user is authenticated and not admin
  if (req.organizationFilter) {
    Object.assign(filter, req.organizationFilter);
  }

  try {
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get dogs with pagination
    const dogs = await Dog.find(filter)
      .populate('reportedBy', 'username profile.firstName profile.lastName')
      .populate('organization', 'name type')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Dog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        dogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDogs: total,
          hasNextPage: skip + dogs.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dogs',
      error: error.message
    });
  }
});

// @desc    Get single dog by ID
// @route   GET /api/dogs/:id
// @access  Public
const getDogById = asyncHandler(async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id)
      .populate('reportedBy', 'username profile.firstName profile.lastName profile.phoneNumber')
      .populate('organization', 'name type contact')
      .populate('activityLog.performedBy', 'username profile.firstName profile.lastName');

    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }

    res.json({
      success: true,
      data: dog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dog',
      error: error.message
    });
  }
});

// @desc    Create new dog record
// @route   POST /api/dogs
// @access  Private
const createDog = asyncHandler(async (req, res) => {
  try {
    const {
      size,
      color,
      breed,
      gender,
      estimatedAge,
      coordinates, // [longitude, latitude]
      address,
      zone,
      healthStatus,
      behavior,
  images,
      notes
    } = req.body;

    // Validate required fields
    if (!size || !coordinates || !zone) {
      return res.status(400).json({
        success: false,
        message: 'Size, coordinates, and zone are required'
      });
    }

    // Create dog object
    const dogData = {
      size,
      color,
      breed,
      gender,
      estimatedAge,
      location: {
        type: 'Point',
        coordinates: coordinates // [longitude, latitude]
      },
      address,
      zone,
      healthStatus,
      behavior,
  // Expect images array of { url, publicId, type }
  images: images || [],
      notes,
      reportedBy: req.user._id,
      organization: req.user.organization
    };

    const dog = new Dog(dogData);
    await dog.save();

    // Add activity log
    await dog.addActivity('Dog registered', req.user._id, 'Initial registration');

    // Update user statistics
    await req.user.updateStatistics('dogsRegistered');

    // Populate response
    await dog.populate('reportedBy', 'username profile.firstName profile.lastName');
    await dog.populate('organization', 'name type');

    res.status(201).json({
      success: true,
      message: 'Dog registered successfully',
      data: dog
    });

    // Emit creation event
    if (req.app.get('io')) {
      req.app.get('io').emit('dog.created', {
        id: dog._id,
        dogId: dog.dogId,
        zone: dog.zone,
        status: dog.status,
        healthStatus: dog.healthStatus,
        createdAt: dog.createdAt,
        reportedBy: dog.reportedBy,
        organization: dog.organization
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating dog record',
      error: error.message
    });
  }
});

// @desc    Update dog record
// @route   PUT /api/dogs/:id
// @access  Private
const updateDog = asyncHandler(async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id);

    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }

    // Check permissions (users can only edit dogs from their organization)
    if (req.organizationFilter && dog.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit dogs from your organization.'
      });
    }

    // Update fields
    const updateFields = req.body;
    Object.assign(dog, updateFields);

    await dog.save();

    // Add activity log
    await dog.addActivity('Dog record updated', req.user._id, 'Record information updated');

    await dog.populate('reportedBy', 'username profile.firstName profile.lastName');
    await dog.populate('organization', 'name type');

    res.json({
      success: true,
      message: 'Dog record updated successfully',
      data: dog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating dog record',
      error: error.message
    });
  }
});

// @desc    Update dog health status
// @route   PATCH /api/dogs/:id/status
// @access  Private
const updateDogStatus = asyncHandler(async (req, res) => {
  const { healthStatus, status, notes } = req.body;

  const dog = await Dog.findById(req.params.id);
  if (!dog) {
    return res.status(404).json({ success: false, message: 'Dog not found' });
  }

  // Snapshot before
  const before = {
    status: dog.status,
    isVaccinated: dog.healthStatus.isVaccinated,
    isSterilized: dog.healthStatus.isSterilized,
    isInjured: dog.healthStatus.isInjured
  };

  if (healthStatus) Object.assign(dog.healthStatus, healthStatus);
  if (status) dog.status = status;
  if (notes) dog.notes = notes;

  await dog.save();

  const after = {
    status: dog.status,
    isVaccinated: dog.healthStatus.isVaccinated,
    isSterilized: dog.healthStatus.isSterilized,
    isInjured: dog.healthStatus.isInjured
  };

  const changes = diffObjects(before, after, Object.keys(before));

  if (changes.length) {
    dog.history.push({
      at: new Date(),
      by: req.user._id,
      changes,
      note: notes
    });
    await dog.save();
  }

  await dog.addActivity('Dog status updated', req.user._id, notes || 'Status update');

  // Emit socket event if io present on app (will wire later)
  if (req.app && req.app.get && req.app.get('io')) {
    req.app.get('io').emit('dog.updated', { id: dog._id, changes, status: dog.status, healthStatus: dog.healthStatus });
  }

  // Broadcast status update for high-priority cases via alerting service
  res.json({ success: true, message: 'Dog status updated', data: dog });
});

// @desc    Get dogs near a location
// @route   GET /api/dogs/location
// @access  Public
const getDogsByLocation = asyncHandler(async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }

    const dogs = await Dog.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
    .populate('reportedBy', 'username profile.firstName profile.lastName')
    .limit(50) // Limit for performance
    .lean();

    res.json({
      success: true,
      data: dogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dogs by location',
      error: error.message
    });
  }
});

// @desc    Delete dog record
// @route   DELETE /api/dogs/:id
// @access  Private (Admin only)
const deleteDog = asyncHandler(async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id);

    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }

    await Dog.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Dog record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting dog record',
      error: error.message
    });
  }
});

// @desc    Get dogs statistics
// @route   GET /api/dogs/stats
// @access  Private
const getDogsStatistics = asyncHandler(async (req, res) => {
  try {
    const stats = await Dog.getStatistics();
    
    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        sterilized: 0,
        vaccinated: 0,
        injured: 0,
        adopted: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = {
  getAllDogs,
  getDogById,
  createDog,
  updateDog,
  updateDogStatus,
  getDogsByLocation,
  deleteDog,
  getDogsStatistics
};

// --- NLP-assisted create flow ---
// @desc    Create new dog record with NLP enrichment and duplicate detection
// @route   POST /api/dogs/nlp
// @access  Private
module.exports.createDogWithNLP = async (req, res) => {
  try {
    const {
      size,
      color,
      breed,
      gender,
      estimatedAge,
      coordinates, // [longitude, latitude]
      address,
      zone,
      healthStatus = {},
      behavior,
      images,
      notes // optional root-level notes
    } = req.body;

    if (!size || !coordinates || !zone) {
      return res.status(400).json({ success: false, message: 'Size, coordinates, and zone are required' });
    }

    // Prefer healthStatus.notes, fallback to root notes
    const healthNotes = healthStatus?.notes || notes || '';

    // Duplicate detection via NLP (text-based) with local candidates
    if (healthNotes) {
      try {
        // Collect recent candidate notes within same zone and nearby area
        const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // last 30 days
        const candidateQuery = { zone };
        // If coordinates provided, prefer nearby dogs first
        let candidatesDocs = [];
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          candidatesDocs = await Dog.find({
            ...candidateQuery,
            createdAt: { $gte: since }
          })
            .select('healthStatus.notes notes breed color zone createdAt location')
            .limit(100)
            .lean();
        } else {
          candidatesDocs = await Dog.find({
            ...candidateQuery,
            createdAt: { $gte: since }
          })
            .select('healthStatus.notes notes breed color zone createdAt')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        }

        // Build candidate texts
        const candidates = candidatesDocs
          .map(d => {
            const pieces = [];
            const n = d?.healthStatus?.notes || d?.notes || '';
            if (n) pieces.push(n);
            if (d?.breed) pieces.push(`breed: ${d.breed}`);
            if (d?.color) pieces.push(`color: ${d.color}`);
            if (d?.zone) pieces.push(`zone: ${d.zone}`);
            return pieces.join(' | ').trim();
          })
          .filter(Boolean)
          .slice(0, 20); // limit for transport size

        const duplicateResult = await nlpService.findDuplicates(healthNotes, candidates, parseFloat(process.env.DOG_DUPLICATE_THRESHOLD || '0.82'));
        if (duplicateResult?.is_potential_duplicate) {
          return res.status(409).json({
            success: false,
            message: 'Potential duplicate detected',
            data: { similar_reports: duplicateResult.similar_reports || [] }
          });
        }
      } catch (e) {
        // Non-fatal
        console.warn('NLP duplicate check failed:', e.message);
      }
    }

    // Analyze report for category, sentiment, urgency, summary, entities
    let nlpAnalysis = null;
    if (healthNotes) {
      try {
        const analysis = await nlpService.analyzeReport(healthNotes, req.body.language || 'en');
        if (analysis) {
          nlpAnalysis = {
            category: analysis.category,
            confidence: analysis.confidence,
            sentiment: analysis.sentiment,
            urgency: analysis.urgency_score ?? analysis.urgency,
            summary: analysis.summary,
            extractedEntities: analysis.entities || analysis.extractedEntities || {}
          };
        }
      } catch (e) {
        console.warn('NLP analyze-report failed:', e.message);
      }
    }

    // Map urgency -> priority
    const urgency = nlpAnalysis?.urgency ?? 0;
    const priority = urgency >= 0.85 ? 'critical' : urgency >= 0.7 ? 'high' : urgency >= 0.4 ? 'normal' : 'low';

    const dogData = {
      size,
      color,
      breed,
      gender,
      estimatedAge,
      location: { type: 'Point', coordinates },
      address,
      zone,
      healthStatus: {
        ...healthStatus,
        notes: healthNotes || healthStatus?.notes,
        nlpAnalysis: nlpAnalysis || undefined
      },
      behavior,
      images: images || [],
      notes,
      priority,
      reportedBy: req.user._id,
      organization: req.user.organization
    };

    const dog = new Dog(dogData);
    await dog.save();

    await dog.addActivity('Dog registered (NLP)', req.user._id, 'Initial registration with NLP enrichment');
    await req.user.updateStatistics?.('dogsRegistered');

    await dog.populate('reportedBy', 'username profile.firstName profile.lastName');
    await dog.populate('organization', 'name type');

    res.status(201).json({ success: true, message: 'Dog registered successfully', data: dog });

    // Dynamic Alerting Pipeline: Auto-flag high-priority/emergency cases
    // Leverages real-time sentiment and urgency analysis for instant action
    if (nlpAnalysis && urgency >= 0.4) {
      try {
        const io = req.app && req.app.get ? req.app.get('io') : null;
        if (io) {
          io.emit('dog.nlpAnalyzed', {
            id: dog._id,
            urgency,
            priority,
            category: nlpAnalysis.category,
            sentiment: nlpAnalysis.sentiment,
            zone: dog.zone
          });

          if (urgency >= 0.7) {
            io.emit('dog.highUrgency', { id: dog._id, urgency, zone: dog.zone });
          }
        }
      } catch (e) {
        console.warn('Alert emission failed:', e.message);
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating dog record with NLP', error: error.message });
  }
};
