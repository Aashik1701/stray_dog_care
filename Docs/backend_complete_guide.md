
# EASIEST BACKEND SETUP - COMPLETE GUIDE
## Node.js + Express + MongoDB Atlas (Zero Configuration)

### 🎯 BACKEND FEATURES OVERVIEW

#### 🔐 Authentication & Authorization
- **JWT Token-based Authentication**: Secure user sessions
- **Role-based Access Control**: Field workers, admins, NGO coordinators
- **Password Hashing**: Bcrypt for secure password storage
- **Session Management**: Automatic token refresh and validation

#### 📊 Core API Endpoints
- **Dog Management**: CRUD operations for dog records
- **User Management**: Registration, authentication, profile management
- **File Upload**: Image handling with Cloudinary integration
- **Real-time Features**: WebSocket connections for live updates
- **Analytics**: Statistics and reporting endpoints

#### 🗄️ Database Design
- **MongoDB Collections**: Dogs, Users, Organizations, Activities
- **Relationships**: Proper referencing and population
- **Indexing**: Optimized queries for location and search
- **Validation**: Schema validation and data integrity

#### 🚀 Real-time Features
- **Socket.io Integration**: Live updates for new registrations
- **Push Notifications**: Alert systems for critical cases
- **Event Broadcasting**: Multi-user collaboration features
- **Connection Management**: Handle disconnections gracefully

### SUPER QUICK SETUP (10 minutes)

```bash
# Create backend project
mkdir stray-dog-backend
cd stray-dog-backend

# Initialize project
npm init -y

# Install all dependencies at once
npm install express mongoose cors dotenv bcryptjs jsonwebtoken
npm install multer cloudinary socket.io express-rate-limit helmet
npm install morgan compression express-validator
npm install nodemon --save-dev

# Create project structure
mkdir src routes models middleware controllers utils config
mkdir uploads public

# Create basic files
touch src/app.js src/server.js .env .gitignore
```

### PROJECT STRUCTURE (ORGANIZED & SCALABLE)

```
stray-dog-backend/
├── src/
│   ├── app.js              # Express app configuration
│   ├── server.js           # Server startup
│   ├── routes/             # API route definitions
│   │   ├── auth.js         # Authentication routes
│   │   ├── dogs.js         # Dog management routes
│   │   ├── users.js        # User management routes
│   │   ├── upload.js       # File upload routes
│   │   └── dashboard.js    # Analytics routes
│   ├── models/             # MongoDB schemas
│   │   ├── Dog.js          # Dog data model
│   │   ├── User.js         # User data model
│   │   └── Organization.js # Organization model
│   ├── controllers/        # Business logic
│   │   ├── authController.js
│   │   ├── dogController.js
│   │   └── dashboardController.js
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── upload.js       # File upload middleware
│   │   └── validation.js   # Input validation
│   ├── utils/              # Utility functions
│   │   ├── cloudinary.js   # Image upload config
│   │   └── helpers.js      # Helper functions
│   └── config/             # Configuration files
│       ├── database.js     # Database connection
│       └── constants.js    # App constants
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
└── package.json           # Dependencies and scripts
```

### STEP-BY-STEP IMPLEMENTATION

#### 1. Environment Configuration (.env)

```bash
# .env file
NODE_ENV=development
PORT=3000

# MongoDB Atlas (Free 512MB cluster)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/straydog?retryWrites=true&w=majority

# JWT Secret (generate random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Cloudinary (Free 25GB storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key  
CLOUDINARY_API_SECRET=your-api-secret

# App Configuration
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

#### 2. Database Models (MongoDB Schemas)

```javascript
// src/models/Dog.js
const mongoose = require('mongoose');

const dogSchema = new mongoose.Schema({
  dogId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'DOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
  },

  // Basic Information
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large'],
    required: true
  },
  color: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Unknown'],
    default: 'Unknown'
  },

  // Location Data
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String,
    area: String,
    zone: String
  },

  // Health Status
  healthStatus: {
    vaccinated: { type: Boolean, default: false },
    sterilized: { type: Boolean, default: false },
    injured: { type: Boolean, default: false },
    lastVaccination: Date,
    lastSterilization: Date,
    healthNotes: String
  },

  // Media
  images: [{
    url: String,
    publicId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Tracking
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },

  // Status
  status: {
    type: String,
    enum: ['Active', 'Relocated', 'Deceased', 'Adopted'],
    default: 'Active'
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
dogSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
dogSchema.index({ dogId: 1 });
dogSchema.index({ reportedBy: 1 });
dogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Dog', dogSchema);
```

```javascript
// src/models/User.js
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
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Profile Information
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    avatar: String,
    bio: String
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ['field_worker', 'admin', 'ngo_coordinator', 'volunteer'],
    default: 'field_worker'
  },
  permissions: [{
    type: String,
    enum: ['create_dogs', 'edit_dogs', 'delete_dogs', 'view_analytics', 'manage_users']
  }],

  // Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },

  // Activity Tracking
  stats: {
    dogsRegistered: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    totalActivities: { type: Number, default: 0 }
  },

  // Account Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

#### 3. Main App Configuration (src/app.js)

```javascript
// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const dogRoutes = require('./routes/dogs');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression and logging
app.use(compression());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dogs', dogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Stray Dog Management API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

#### 4. Server Startup (src/server.js)

```javascript
// src/server.js
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their organization room
  socket.on('joinOrganization', (orgId) => {
    socket.join(`org_${orgId}`);
  });

  // Handle new dog registration broadcast
  socket.on('newDogRegistered', (dogData) => {
    socket.broadcast.emit('dogRegistered', dogData);
  });

  // Handle dog status updates
  socket.on('dogStatusUpdate', (updateData) => {
    socket.broadcast.emit('dogStatusChanged', updateData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
```

#### 5. Database Connection (src/config/database.js)

```javascript
// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

#### 6. Authentication Middleware (src/middleware/auth.js)

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
```

#### 7. Dog Management Routes (src/routes/dogs.js)

```javascript
// src/routes/dogs.js
const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getAllDogs,
  getDogById,
  createDog,
  updateDog,
  deleteDog,
  getDogsByLocation,
  updateDogStatus
} = require('../controllers/dogController');

const router = express.Router();

// Public routes (for mobile app)
router.get('/', getAllDogs);
router.get('/location', getDogsByLocation);
router.get('/:id', getDogById);

// Protected routes (require authentication)
router.use(auth); // Apply auth middleware to all routes below

router.post('/', createDog);
router.put('/:id', updateDog);
router.patch('/:id/status', updateDogStatus);
router.delete('/:id', deleteDog);

module.exports = router;
```

#### 8. Dog Controller (src/controllers/dogController.js)

```javascript
// src/controllers/dogController.js
const Dog = require('../models/Dog');
const User = require('../models/User');

// Get all dogs with filtering and pagination
exports.getAllDogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      sterilized, 
      area, 
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (sterilized !== undefined) filter['healthStatus.sterilized'] = sterilized === 'true';
    if (area) filter['location.area'] = new RegExp(area, 'i');
    if (search) {
      filter.$or = [
        { dogId: new RegExp(search, 'i') },
        { 'location.address': new RegExp(search, 'i') },
        { color: new RegExp(search, 'i') }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: {
        path: 'reportedBy',
        select: 'username profile.firstName profile.lastName'
      }
    };

    const dogs = await Dog.paginate(filter, options);

    res.json({
      success: true,
      data: dogs.docs,
      pagination: {
        page: dogs.page,
        pages: dogs.pages,
        total: dogs.total,
        limit: dogs.limit
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Create new dog record
exports.createDog = async (req, res) => {
  try {
    const dogData = {
      ...req.body,
      reportedBy: req.user._id
    };

    const dog = new Dog(dogData);
    await dog.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.dogsRegistered': 1, 'stats.totalActivities': 1 },
      'stats.lastActive': new Date()
    });

    await dog.populate('reportedBy', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Dog registered successfully',
      data: dog
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Failed to create dog record', 
      error: error.message 
    });
  }
};

// Get dogs by location (for map view)
exports.getDogsByLocation = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    // Convert radius from kilometers to radians
    const radiusInRadians = parseFloat(radius) / 6371;

    const dogs = await Dog.find({
      'location.latitude': {
        $gte: parseFloat(latitude) - radiusInRadians,
        $lte: parseFloat(latitude) + radiusInRadians
      },
      'location.longitude': {
        $gte: parseFloat(longitude) - radiusInRadians,
        $lte: parseFloat(longitude) + radiusInRadians
      },
      status: 'Active'
    }).select('dogId location healthStatus images.url createdAt');

    res.json({
      success: true,
      data: dogs,
      count: dogs.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message 
    });
  }
};

// Update dog status (sterilized, vaccinated, etc.)
exports.updateDogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { healthStatus, status } = req.body;

    const updateData = { updatedAt: new Date() };
    if (healthStatus) updateData.healthStatus = { ...healthStatus };
    if (status) updateData.status = status;

    const dog = await Dog.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('reportedBy', 'username profile.firstName profile.lastName');

    if (!dog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Dog not found' 
      });
    }

    res.json({
      success: true,
      message: 'Dog status updated successfully',
      data: dog
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Failed to update dog status', 
      error: error.message 
    });
  }
};
```

### PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo "No tests specified" && exit 0",
    "build": "echo "No build step required"",
    "seed": "node scripts/seedData.js"
  }
}
```

### DEVELOPMENT COMMANDS

```bash
# Install dependencies
npm install

# Start development server (with auto-restart)
npm run dev

# Start production server
npm start

# Check server health
curl http://localhost:3000/health
```

### DEPLOYMENT OPTIONS

#### Option 1: Railway (Easiest - $0 to start)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Option 2: Heroku (Free tier available)
```bash
# Install Heroku CLI and deploy
heroku create your-app-name
git push heroku main
```

#### Option 3: DigitalOcean App Platform (Simple)
```bash
# Connect GitHub repo and deploy via web interface
# $5/month for basic droplet
```

### MONGODB ATLAS SETUP (FREE 512MB)

1. **Create Account**: Go to mongodb.com/atlas
2. **Create Cluster**: Choose M0 (Free tier)
3. **Setup Access**: 
   - Add database user
   - Whitelist IP addresses (0.0.0.0/0 for development)
4. **Get Connection String**: 
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### CLOUDINARY SETUP (FREE 25GB)

1. **Create Account**: Go to cloudinary.com
2. **Get Credentials**: 
   - Dashboard shows Cloud name, API Key, API Secret
   - Add to .env file
3. **Configure Upload**: Already included in backend code

### KEY FEATURES IMPLEMENTED

✅ **Complete CRUD Operations**: Create, read, update, delete dogs
✅ **User Authentication**: JWT-based secure authentication
✅ **File Upload**: Image handling with Cloudinary
✅ **Real-time Updates**: Socket.io integration
✅ **Geolocation Support**: Location-based queries
✅ **Data Validation**: Input validation and sanitization
✅ **Error Handling**: Comprehensive error management
✅ **Security Features**: Rate limiting, CORS, helmet
✅ **Performance**: Database indexing and optimization

### NEW: ROLE-BASED STATUS MANAGEMENT & REAL-TIME EVENTS (Phase Update)

#### Roles
Current roles implemented in `User.role` (enum):
```
field_worker | ngo_coordinator | municipal_admin | veterinarian | system_admin
```
`system_admin` implicitly bypasses role checks. Middleware: `requireRole(...roles)`.

#### Dog Status / Health Patch Endpoint
```
PATCH /api/dogs/:id/status
Body (any subset):
{
  "healthStatus": {
    "isVaccinated": true,
    "isSterilized": false,
    "isInjured": false
  },
  "status": "active",          // optional: adopted|deceased|relocated|missing|active
  "notes": "Vaccinated today"
}
```
Response includes updated dog and internally appends an immutable audit entry:
```
dog.history[]. { at, by, changes:[{ field, from, to }], note }
```

Allowed patching roles: field_worker, ngo_coordinator, veterinarian, municipal_admin, system_admin.

#### Change History
Stored in `dog.history` separate from `activityLog` for machine-friendly diffing. Each patch collects shallow diffs over:
`status`, `isVaccinated`, `isSterilized`, `isInjured`.

#### Socket Events
Emitted globally (future iteration: limit by organization room):
```
dog.created: {
  id, dogId, zone, status, healthStatus, createdAt, reportedBy, organization
}
dog.updated: {
  id, changes: [{ field, from, to }], status, healthStatus
}
```
Client Guidance:
1. Connect to socket server (same origin as API).
2. Optionally emit `join-organization` with organizationId to subscribe to scoped rooms (future enhancement—currently broadcasted).
3. On `dog.created` → prepend or merge into local list if not duplicate.
4. On `dog.updated` → find matching dog and apply field-level merges; append history if UI tracks it locally.

#### Migration / Backfill Notes
Existing dogs will have empty `history`; first status change will start recording. If you need to seed initial baseline, you could run a one-off script traversing all docs and inserting a single history record representing the initial state.

#### Future Extensions
* Room-based emissions by `organization`
* Granular events (e.g., `dog.status.changed`, `dog.health.vaccinated`)
* Webhook dispatch for external systems
* Pagination & pruning strategy for large `history` arrays


### ESTIMATED SETUP TIME

- **Basic Setup**: 30 minutes
- **Database Configuration**: 15 minutes
- **Core APIs**: 1-2 days
- **Authentication**: 1 day
- **File Upload**: Half day
- **Real-time Features**: 1 day
- **Testing & Polish**: 1 day

**Total: 1 week for complete backend**

### WHY THIS IS THE EASIEST SETUP

✅ **Zero Configuration**: Everything works out of the box
✅ **Free Services**: MongoDB Atlas + Cloudinary free tiers
✅ **One Command Deploy**: Railway deployment in minutes
✅ **Excellent Documentation**: Each service has great docs
✅ **Scalable**: Grows with your app from prototype to production
✅ **Student Friendly**: All services offer educational pricing
