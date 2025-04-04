require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const ROLES = require('../constants/roles');

// Указываем URI MongoDB напрямую, если он отсутствует в переменных окружения
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supply-flow';

const createSupplySpecialist = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB:', MONGODB_URI);

        // Проверяем, существует ли пользователь с указанным номером
        let user = await User.findOne({ phone: '78888888888' });

        if (user) {
            // Если пользователь существует, обновляем его роль
            user.role = ROLES.SUPPLY_SPECIALIST;
            user.isVerified = true;
            user.hasCompletedRegistration = true;
            user.lastName = 'Петров';
            user.firstName = 'Сергей';
            user.middleName = 'Иванович';
            console.log('Updating existing user with SUPPLY_SPECIALIST role');
        } else {
            // Если пользователь не существует, создаем нового
            user = new User({
                phone: '78888888888',
                role: ROLES.SUPPLY_SPECIALIST,
                isVerified: true,
                hasCompletedRegistration: true,
                lastName: 'Петров',
                firstName: 'Сергей',
                middleName: 'Иванович'
            });
            console.log('Creating new user with SUPPLY_SPECIALIST role');
        }

        await user.save();
        console.log('Supply specialist user updated/created successfully');
        console.log('Phone: 78888888888');
        console.log('Role:', ROLES.SUPPLY_SPECIALIST);
        console.log('Name: Петров Сергей Иванович');
    } catch (error) {
        console.error('Error creating supply specialist:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
};

createSupplySpecialist(); 