const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
require('dotenv').config({ path: '../.env' });

const generateToken = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ phone: '79999999999' });
    if (!user) {
      console.error('Test user not found');
      return;
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        phone: user.phone
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Generated token:', token);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error generating token:', error);
  }
};

generateToken(); 