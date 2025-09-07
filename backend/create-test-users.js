const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const createTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@dogster.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Create system admin
      const adminUser = new User({
        username: 'admin',
        email: 'admin@dogster.com',
        password: 'admin123',
        profile: {
          firstName: 'System',
          lastName: 'Administrator',
          phoneNumber: '9999999999'
        },
        role: 'system_admin',
        permissions: ['system_admin']
      });

      await adminUser.save();
      console.log('✅ Created system admin user:');
      console.log('  Email: admin@dogster.com');
      console.log('  Password: admin123');
    }

    // Check if field worker exists
    const existingWorker = await User.findOne({ email: 'worker@dogster.com' });
    if (existingWorker) {
      console.log('Field worker already exists');
    } else {
      // Create field worker
      const workerUser = new User({
        username: 'fieldworker',
        email: 'worker@dogster.com',
        password: 'worker123',
        profile: {
          firstName: 'Field',
          lastName: 'Worker',
          phoneNumber: '8888888888'
        },
        role: 'field_worker',
        permissions: ['create_dog', 'edit_dog']
      });

      await workerUser.save();
      console.log('✅ Created field worker user:');
      console.log('  Email: worker@dogster.com');
      console.log('  Password: worker123');
    }

    // Check if NGO coordinator exists
    const existingCoordinator = await User.findOne({ email: 'coordinator@dogster.com' });
    if (existingCoordinator) {
      console.log('NGO coordinator already exists');
    } else {
      // Create NGO coordinator
      const coordinatorUser = new User({
        username: 'ngocoordinator',
        email: 'coordinator@dogster.com',
        password: 'coordinator123',
        profile: {
          firstName: 'NGO',
          lastName: 'Coordinator',
          phoneNumber: '7777777777'
        },
        role: 'ngo_coordinator',
        permissions: ['create_dog', 'edit_dog', 'view_analytics', 'manage_users']
      });

      await coordinatorUser.save();
      console.log('✅ Created NGO coordinator user:');
      console.log('  Email: coordinator@dogster.com');
      console.log('  Password: coordinator123');
    }

    console.log('\n🎉 Test users setup complete!');
    console.log('\nYou can now login to the dashboard with any of these accounts:');
    console.log('- System Admin: admin@dogster.com / admin123');
    console.log('- NGO Coordinator: coordinator@dogster.com / coordinator123');
    console.log('- Field Worker: worker@dogster.com / worker123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
  }
};

createTestUsers();
