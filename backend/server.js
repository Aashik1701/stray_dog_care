const http = require('http');
const socketIo = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const alertService = require('./src/services/alertService');

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:19006', // Expo web
      'http://localhost:8081', 'http://localhost:8082'   // Expo web alternative
    ],
    methods: ['GET', 'POST']
  }
});

// Attach to app for access in controllers
app.set('io', io);

// Socket.io connection handling with enhanced alert pipeline
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their organization room
  socket.on('join-organization', (organizationId) => {
    socket.join(`org-${organizationId}`);
    console.log(`User ${socket.id} joined organization ${organizationId}`);
  });

  // Join user to their zone room (for zone-specific alerts)
  socket.on('join-zone', (zone) => {
    socket.join(`zone-${zone}`);
    console.log(`User ${socket.id} joined zone ${zone}`);
  });

  // Handle new dog registration broadcast
  socket.on('new-dog-registered', (data) => {
    socket.to(`org-${data.organizationId}`).emit('dog-registered', data);
  });

  // Handle dog status updates
  socket.on('dog-status-updated', (data) => {
    socket.to(`org-${data.organizationId}`).emit('dog-status-changed', data);
  });

  // Alert acknowledgment
  socket.on('alert.acknowledge', (data) => {
    socket.to(`org-${data.organizationId}`).emit('alert.acknowledged', data);
  });

  // Alert assignment
  socket.on('alert.assign', (data) => {
    socket.to(`org-${data.organizationId}`).emit('alert.assigned', data);
  });

  // Alert resolution
  socket.on('alert.resolve', (data) => {
    socket.to(`org-${data.organizationId}`).emit('alert.resolved', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Automated escalation checker (runs every 5 minutes)
// This implements operational intelligence for automatic escalation
setInterval(() => {
  alertService.checkAndEscalateAlerts(io).catch(err => {
    console.error('[Server] Escalation check error:', err);
  });
}, 5 * 60 * 1000); // 5 minutes

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
