const mongoose = require('mongoose');
const User = require('../models/user.model');
const Supply = require('../models/supply.model');
const ROLES = require('../constants/roles');
require('dotenv').config();

async function initializeDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Создание администратора
    const admin = new User({
      phone: '79999999999',
      role: ROLES.ADMIN,
      isVerified: true,
      hasCompletedRegistration: true,
      lastName: 'Админов',
      firstName: 'Админ',
      middleName: 'Админович'
    });

    await admin.save();
    console.log('Администратор создан:', admin);

    // Создание сотрудника
    const employee = new User({
      phone: '77777777777',
      role: ROLES.EMPLOYEE,
      isVerified: true,
      hasCompletedRegistration: true,
      lastName: 'Понаморев',
      firstName: 'Сергей',
      middleName: 'Алексеевич'
    });

    await employee.save();
    console.log('Сотрудник создан:', employee);

    // Создание заявки
    const supplyRequest = new Supply({
      title: 'Заказ инструментов для ремонтной бригады №2',
      description: 'В связи с началом планового ремонта производственной линии требуется обновить комплект инструментов ремонтной бригады. Текущие инструменты имеют значительный износ и не позволяют выполнять работы с необходимым качеством.',
      priority: 'high',
      status: 'new',
      deadline: new Date('2025-06-10T23:59:59.999Z'),
      items: [
        {
          name: 'Набор отверток прецизионных',
          quantity: 3,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Ключи гаечные комбинированные 8-24 мм',
          quantity: 2,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Мультиметр цифровой',
          quantity: 2,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Дрель-шуруповерт аккумуляторная',
          quantity: 1,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Перчатки монтажные противоскользящие',
          quantity: 10,
          unit: 'шт',
          purchased: false
        }
      ],
      createdBy: {
        userId: employee._id,
        name: `${employee.lastName} ${employee.firstName} ${employee.middleName}`
      }
    });

    await supplyRequest.save();
    console.log('Заявка создана:', supplyRequest);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  }
}

initializeDatabase(); 