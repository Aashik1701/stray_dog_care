# Stray Dog Care Management System

> AI-powered platform for systematic animal welfare and public health management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.76+-61DAFB?logo=react)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

[Features](#key-features) • [Architecture](#architecture) • [Quick Start](#quick-start) • [API Documentation](#api-documentation) • [Contributing](#contributing)

---

## Overview

A comprehensive digital ecosystem for stray dog population management through AI/NLP-powered insights, real-time coordination, and data-driven decision making. This platform addresses India's stray dog crisis affecting 60–80 million animals and causing 18,000+ annual rabies deaths.

### Problem Statement

- Managing 180,000+ stray dogs in urban centers (Chennai model)
- India accounts for 36% of global rabies deaths (3.7M annual bite cases)
- ₹8.6 billion annual burden on healthcare and municipal budgets
- Current manual systems cannot match population growth rates

### Solution Approach

The platform provides:

- Population control: Systematic tracking and sterilization management with 85% coverage targets
- Public health: Rabies prevention, bite incident reduction, and disease outbreak monitoring
- Data intelligence: NLP-driven analytics, predictive modeling, and resource optimization
- Community coordination: Unified platform connecting NGOs, government bodies, field workers, and citizens
- Transparency: Real-time fund utilization tracking and impact measurement

---

## Key Features

### Natural Language Processing

The system integrates IndicBERT for multilingual text analysis:

- Sentiment analysis with positive/negative/neutral classification
- Automated urgency scoring (0–1 scale) for incident prioritization
- Entity extraction for breeds, locations, and symptoms
- Report categorization (injury, adoption, sterilization, bite incidents)
- Duplicate detection using vector embeddings and cosine similarity

### Duplicate Detection System

Advanced similarity detection prevents redundant reports:

- Sentence-Transformers generate 384-dimensional embeddings
- MongoDB Atlas Vector Search with cosine similarity threshold of 0.82
- Spatial clustering with zone-based candidate filtering (30-day windows)
- Conflict resolution with 409 HTTP responses and similar case suggestions

### Analytics Dashboard

Real-time insights for decision makers:

- Daily sentiment trend analysis across geographic zones
- Urgency distribution heatmaps for resource allocation
- Topic modeling and automated theme classification
- Health issue tracking with symptom entity extraction
- Location-based hotspot detection for targeted interventions
- Duplicate rate monitoring and prevention metrics

### Mobile Application

Cross-platform React Native app for field operations:

- Multi-photo capture with automatic compression and metadata tagging
- GPS integration with ±5m coordinate accuracy for territorial return tracking
- Offline-first architecture using SQLite with automatic cloud sync
- Real-time updates via Socket.IO for team coordination
- Voice-to-text speech recognition for hands-free reporting
- AI-suggested route optimization for daily field operations
- Push notifications for emergency alerts and assignment updates

### Web Dashboard

React-based administrative interface:

- Live analytics with population statistics and health metrics
- Interactive Mapbox integration with clustering and heatmaps
- Advanced charting using Recharts for trend analysis
- Role-based access control (field workers, coordinators, admins, veterinarians)
- Budget tracking with fund allocation and utilization monitoring
- Automated PDF report generation for government compliance
- Semantic search with natural language query support

### Backend Architecture

Node.js/Express API with Python microservices:

- RESTful API with 50+ endpoints
- JWT authentication and role-based authorization
- MongoDB Atlas with geospatial and vector indexes
- Socket.IO for real-time bidirectional communication
- FastAPI NLP service on port 8000 with circuit breaker pattern
- Security: Helmet.js, CORS, rate limiting (100 requests/15 minutes)
- Logging via Morgan with Sentry error monitoring
- Compression middleware and optional Redis caching

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
├──────────────────────────┬──────────────────────────────────────────┤
│   Mobile App (Expo)      │    Web Dashboard (React+Vite)            │
│   - React Native 0.76+   │    - React 19 + TailwindCSS 3.4          │
│   - Offline-first        │    - Recharts + Framer Motion            │
│   - GPS + Camera         │    - Socket.IO Client                    │
└──────────────────────────┴──────────────────────────────────────────┘
                                    ↕ HTTPS + WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                 │
│                  Express 4.21 + Socket.IO 4.8                       │
│   - JWT Auth + RBAC      - Rate Limiting                            │
│   - CORS + Helmet        - File Upload (Multer)                     │
└─────────────────────────────────────────────────────────────────────┘
              ↕                          ↕                    ↕
┌──────────────────────┐   ┌────────────────────┐   ┌─────────────────┐
│   MongoDB Atlas      │   │  NLP Service       │   │  External APIs  │
│   - Dogs Collection  │   │  FastAPI 0.115     │   │  - Cloudinary   │
│   - Reports (Vector) │   │  - IndicBERT       │   │  - Mapbox       │
│   - Users + Orgs     │   │  - Transformers    │   │  - Firebase     │
│   - 2dsphere Index   │   │  - Vector Embed    │   │  - Sentry       │
└──────────────────────┘   └────────────────────┘   └─────────────────┘
```

### Technology Stack

| Layer    | Technologies                                         | Purpose                                           |
|----------|------------------------------------------------------|---------------------------------------------------|
| Mobile   | React Native 0.76, Expo 52, TypeScript               | Cross-platform iOS/Android with native capabilities |
| Web      | React 19, Vite 7, TailwindCSS 3.4, Recharts 3.1      | Fast, responsive dashboard with rich visualizations |
| Backend  | Node.js 22, Express 4.21, Socket.IO 4.8              | Scalable API with real-time features              |
| NLP      | FastAPI 0.115, IndicBERT, Sentence-Transformers      | Multilingual NLP processing and embeddings        |
| Database | MongoDB Atlas 8.0 (Vector Search enabled)            | Flexible schemas with geospatial and vector indexes |
| Storage  | Cloudinary, AWS S3 (optional)                        | Image CDN with automatic optimization             |
| Maps     | Mapbox GL JS 3.0, React Google Maps API              | Interactive mapping and geocoding                 |
| Auth     | JWT, bcrypt, express-rate-limit                      | Secure authentication and rate limiting           |
| DevOps   | Git, Docker (optional), Railway/Render               | Version control and cloud deployment              |

### Data Flow

```
┌─────────────┐                    ┌─────────────┐
│   Client    │───── HTTPS ───────▶│  Express    │
│ (Mobile/Web)│◀──── WS/SSE ───────│   Server    │
└─────────────┘                    └──────┬──────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
              ┌─────────────┐      ┌─────────────┐    ┌──────────────┐
              │   MongoDB   │      │  FastAPI    │    │  Cloudinary  │
              │   (Atlas)   │      │  NLP Svc    │    │   (Images)   │
              │             │      │             │    │              │
              │ • Dogs      │      │ • IndicBERT │    │ • Photos     │
              │ • Reports   │      │ • Embeddings│    │ • Transforms │
              │ • Users     │      │ • Sentiment │    │ • CDN        │
              └─────────────┘      └─────────────┘    └──────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 22+ (https://nodejs.org/)
- Python 3.9+ (https://www.python.org/downloads/)
- MongoDB Atlas account (https://www.mongodb.com/cloud/atlas/register)
- Git (https://git-scm.com/downloads)

### Installation

1. Clone the repository

```bash
git clone https://github.com/Aashik1701/stray_dog_care.git
cd stray_dog_care
```

2. Backend setup

```bash
cd backend
npm install

# Create .env file
cat > .env << 'EOF'
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NLP_SERVICE_URL=http://localhost:8000
EOF

npm run dev
```

Backend runs on http://localhost:5000

3. NLP service setup

```bash
cd nlp_service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
python main.py
```

NLP service runs on http://localhost:8000

4. Web dashboard setup

```bash
cd web_dashboard
npm install

echo "VITE_API_URL=http://localhost:5000" > .env

npm run dev
```

Web dashboard runs on http://localhost:5173

5. Mobile app setup

```bash
cd StrayDogApp
npm install

# Configure API URL in app.config.js
# Update expo.extra.apiUrl to your backend URL

npm start
```

Access via Expo Go app on your mobile device.

---

## API Documentation

### Authentication Endpoints

```http
POST /api/auth/register     # Create new user account
POST /api/auth/login        # Login and receive JWT token
GET  /api/auth/profile      # Retrieve current user profile
PUT  /api/auth/profile      # Update profile information
```

### Dogs Management

```http
GET    /api/dogs              # List all dogs (paginated)
POST   /api/dogs              # Register new dog with NLP enrichment
GET    /api/dogs/:id          # Get dog details by ID
PUT    /api/dogs/:id          # Update dog information
DELETE /api/dogs/:id          # Remove dog record
GET    /api/dogs/search       # Search dogs by location or criteria
```

### Reports and Incidents

```http
GET    /api/reports           # List all reports
POST   /api/reports           # Submit new report with NLP analysis
GET    /api/reports/:id       # Get report details
PUT    /api/reports/:id       # Update report status
DELETE /api/reports/:id       # Delete report
GET    /api/reports/analytics/summary  # Analytics dashboard data
```

### NLP Operations

```http
POST /api/nlp/analyze         # Analyze text for sentiment and urgency
POST /api/nlp/find-duplicates # Find similar reports or dogs
GET  /api/nlp/health          # Check NLP service status
```

### Environment Configuration

Backend (.env):

```bash
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/stray_dog_care
JWT_SECRET=your_secret_key_min_32_characters
JWT_EXPIRATION=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# NLP Service
NLP_SERVICE_URL=http://localhost:8000
NLP_TIMEOUT_MS=10000

# Optional Services
MAPBOX_TOKEN=your_mapbox_token
SENTRY_DSN=your_sentry_dsn
```

Web Dashboard (.env):

```bash
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_MAPBOX_TOKEN=your_mapbox_token
```

Mobile App (app.config.js):

```javascript
export default {
  expo: {
    extra: {
      apiUrl: "http://YOUR_IP:5000", // Use local IP, not localhost
      socketUrl: "http://YOUR_IP:5000",
    },
  },
};
```

---

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String, // unique
  password: String, // hashed
  role: String, // 'admin', 'coordinator', 'field_worker', 'veterinarian'
  organization: ObjectId, // ref: 'Organization'
  permissions: [String], // e.g. ['view_analytics', 'manage_users']
  createdAt: Date,
  updatedAt: Date,
}
```

### Dogs Collection

```javascript
{
  _id: ObjectId,
  name: String,
  breed: String,
  color: String,
  gender: String,
  age: String,
  healthStatus: String,
  sterilized: Boolean,
  vaccinated: Boolean,
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String,
    zone: String,
  },
  photos: [String], // Cloudinary URLs
  notes: String,
  registeredBy: ObjectId, // ref: 'User'
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
db.dogs.createIndex({ location: "2dsphere" })
db.dogs.createIndex({ zone: 1, createdAt: -1 })
```

### Reports Collection

Vector search enabled for duplicate detection.

```javascript
{
  _id: ObjectId,
  description: String,
  reportType: String, // 'injury', 'sterilization', 'adoption', 'bite_incident'
  urgency: Number, // 0-1 (NLP-generated)
  sentiment: String, // 'positive', 'negative', 'neutral'
  entities: {
    symptoms: [String], // Extracted by NLP
    locations: [String],
    topics: [String],
  },
  embedding: [Number], // 384-dimensional vector
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String,
  },
  status: String, // 'pending', 'in_progress', 'resolved'
  assignedTo: ObjectId, // ref: 'User'
  photos: [String],
  reportedBy: ObjectId, // ref: 'User'
  isDuplicate: Boolean,
  originalReport: ObjectId, // ref: 'Report'
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
db.reports.createIndex({ location: "2dsphere" })
db.reports.createIndex({
  embedding: "vector",
  path: "embedding",
  numDimensions: 384,
  similarity: "cosine",
})
```

---

## Testing

### Backend Tests

```bash
cd backend
npm test
npm run test:watch
npm run test:coverage
```

### Web Dashboard Tests

```bash
cd web_dashboard
npm test
npm run test:ui
```

### API Testing Examples

Register a new user:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "field_worker"
  }'
```

Create a dog report:

```bash
curl -X POST http://localhost:5000/api/dogs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Bruno",
    "breed": "Indian Pariah",
    "location": {
      "coordinates": [80.2707, 13.0827],
      "address": "T Nagar, Chennai"
    },
    "notes": "Friendly dog, slight limp on right leg"
  }'
```

---

## Contributing

Contributions are welcome. Please follow these guidelines:

### Development Workflow

1. Fork the repository and create a feature branch

```bash
git clone https://github.com/YOUR_USERNAME/stray_dog_care.git
cd stray_dog_care
git checkout -b feature/your-feature-name
```

2. Make your changes following the existing code style

- Add tests for new features
- Update documentation as needed

3. Verify your changes

```bash
npm test
npm run lint
npm run build
```

4. Commit with clear, descriptive messages

```bash
git commit -m "feat: add duplicate detection for dogs"
git commit -m "fix: resolve coordinate precision issue"
git commit -m "docs: update API endpoint documentation"
```

Follow the Conventional Commits specification.

5. Push and create a Pull Request with detailed description

### Code Style

- JavaScript/TypeScript: https://github.com/airbnb/javascript
- Python: https://pep8.org/
- Commits: https://www.conventionalcommits.org/

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Acknowledgments

- AI4Bharat for IndicBERT multilingual NLP models
- Hugging Face for Transformers and Sentence-Transformers libraries
- MongoDB for Atlas Vector Search capabilities
- React Native and Expo communities
- All open source contributors

---

## Impact

This platform enables:

- Reduction in rabies-related deaths through systematic vaccination tracking
- Improved animal welfare via sterilization monitoring
- Data-driven policy making with evidence-based resource allocation
- Community engagement for local issue reporting and tracking
- Scalability to other cities and animal welfare scenarios

---

Made for animal welfare and public health