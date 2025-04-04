require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const ROLES = require('../constants/roles');

const createAdmin = async (phoneNumber) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminUser = new User({
            phone: phoneNumber,
            role: ROLES.ADMIN,
            isVerified: true,
            hasCompletedRegistration: true
        });

        await adminUser.save();
        console.log('Admin user created successfully');
        console.log('Phone:', phoneNumber);
        console.log('Role:', ROLES.ADMIN);
        console.log('Available roles:', Object.values(ROLES).join(', '));
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.connection.close();
    }
};

// Проверяем, передан ли номер телефона как аргумент
const phoneNumber = process.argv[2];
if (!phoneNumber) {
    console.error('Please provide a phone number as an argument');
    process.exit(1);
}

createAdmin(phoneNumber); 