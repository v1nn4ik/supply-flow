const mongoose = require('mongoose');
const User = require('../models/user.model');
const Task = require('../models/Task');
require('dotenv').config({ path: '../.env' });

const createTestTask = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ phone: '79999999999' });
    if (!user) {
      console.error('Test user not found');
      return;
    }

    const testTask = new Task({
      title: 'Тестовая задача',
      description: 'Это тестовая задача для проверки функционала',
      status: 'pending',
      priority: 'medium',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
      assignedTo: user._id
    });

    const savedTask = await testTask.save();
    console.log('Test task created:', savedTask);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating test task:', error);
  }
};

createTestTask(); 