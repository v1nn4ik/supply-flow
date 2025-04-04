require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const ROLES = require('../constants/roles');

async function updateUserRole(userId, newRole) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return;
        }

        console.log('User before update:', {
            _id: user._id,
            phone: user.phone,
            role: user.role,
            name: `${user.lastName} ${user.firstName}`.trim()
        });

        user.role = newRole;
        await user.save();

        console.log('User role updated successfully');
        console.log('User after update:', {
            _id: user._id,
            phone: user.phone,
            role: user.role,
            name: `${user.lastName} ${user.firstName}`.trim()
        });
        console.log('Available roles:', Object.values(ROLES).join(', '));
    } catch (error) {
        console.error('Error updating user role:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

// Получаем userId и роль из аргументов командной строки
const userId = process.argv[2];
const newRole = process.argv[3];

if (!userId || !newRole) {
    console.error('Usage: node updateUserRole.js <userId> <role>');
    console.error('Available roles:', Object.values(ROLES).join(', '));
    process.exit(1);
}

updateUserRole(userId, newRole); 