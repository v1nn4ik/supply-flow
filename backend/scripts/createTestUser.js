const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config({ path: '../.env' });

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testUser = new User({
      phone: '79999999999',
      isVerified: true,
      hasCompletedRegistration: true,
      lastName: 'Тестов',
      firstName: 'Тест',
      middleName: 'Тестович',
      birthDate: '1990-01-01'
    });

    const savedUser = await testUser.save();
    console.log('Test user created:', savedUser);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
};

createTestUser(); 