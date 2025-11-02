const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const checkUserCredentials = async (emailOrUsername, password) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Normalize email (lowercase and trim)
    const normalizedEmail = String(emailOrUsername).toLowerCase().trim();
    const trimmedUsername = String(emailOrUsername).trim();

    console.log('🔍 Searching for user with:');
    console.log(`   Email (normalized): ${normalizedEmail}`);
    console.log(`   Username: ${trimmedUsername}\n`);

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: trimmedUsername }
      ]
    }).select('+password');

    if (!user) {
      console.log('❌ User not found!');
      console.log('\n📋 Available users:');
      const allUsers = await User.find({}).select('email username role isActive');
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (username: ${u.username}, role: ${u.role}, active: ${u.isActive})`);
      });
      await mongoose.disconnect();
      return;
    }

    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'MISSING'}\n`);

    // Check password
    if (user.password) {
      const isValid = await user.comparePassword(password);
      console.log(`🔐 Password check: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

      if (isValid) {
        console.log('✅ Credentials are correct! Login should work.');
      } else {
        console.log('❌ Password is incorrect!');
        console.log('\n💡 To reset password, you can:');
        console.log('   1. Use the forgot password feature in the app');
        console.log('   2. Or delete this user and recreate with create-test-users.js');
        console.log('   3. Or manually update in MongoDB');
      }
    } else {
      console.log('❌ User has no password hash! This is an error.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Get credentials from command line
const emailOrUsername = process.argv[2];
const password = process.argv[3];

if (!emailOrUsername || !password) {
  console.log('Usage: node check-user-credentials.js <email-or-username> <password>');
  console.log('\nExample:');
  console.log('  node check-user-credentials.js admin@dogster.com admin123');
  console.log('  node check-user-credentials.js admin admin123');
  process.exit(1);
}

checkUserCredentials(emailOrUsername, password);

