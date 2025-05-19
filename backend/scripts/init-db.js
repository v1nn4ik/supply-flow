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

    // Создание сотрудников
    const employees = [
      {
        phone: '79123456789',
        role: ROLES.EMPLOYEE,
        lastName: 'Понаморев',
        firstName: 'Сергей',
        middleName: 'Алексеевич'
      },
      {
        phone: '79234567890',
        role: ROLES.EMPLOYEE,
        lastName: 'Гончаров',
        firstName: 'Денис',
        middleName: 'Павлович'
      },
      {
        phone: '79345678901',
        role: ROLES.EMPLOYEE,
        lastName: 'Иванов',
        firstName: 'Игорь',
        middleName: 'Семёнович'
      },
      {
        phone: '79456789012',
        role: ROLES.EMPLOYEE,
        lastName: 'Зиновьев',
        firstName: 'Елисей',
        middleName: 'Матвеевич'
      },
      {
        phone: '79567890123',
        role: ROLES.EMPLOYEE,
        lastName: 'Алексеев',
        firstName: 'Даниил',
        middleName: 'Андреевич'
      },
      {
        phone: '79678901234',
        role: ROLES.EMPLOYEE,
        lastName: 'Захаров',
        firstName: 'Фёдор',
        middleName: 'Егорович'
      },
      {
        phone: '79789012345',
        role: ROLES.EMPLOYEE,
        lastName: 'Семенов',
        firstName: 'Егор',
        middleName: 'Александрович'
      },
      {
        phone: '79890123456',
        role: ROLES.EMPLOYEE,
        lastName: 'Баранов',
        firstName: 'Илья',
        middleName: 'Ильич'
      },
      {
        phone: '79901234567',
        role: ROLES.EMPLOYEE,
        lastName: 'Беликов',
        firstName: 'Олег',
        middleName: 'Егорович'
      },
      {
        phone: '79012345678',
        role: ROLES.EMPLOYEE,
        lastName: 'Гуляев',
        firstName: 'Степан',
        middleName: 'Михайлович'
      },
      {
        phone: '79123456780',
        role: ROLES.EMPLOYEE,
        lastName: 'Пименов',
        firstName: 'Алексей',
        middleName: 'Александрович'
      }
    ];

    // Назначаем троих сотрудников специалистами отдела снабжения
    employees[1].role = ROLES.SUPPLY_SPECIALIST; // Гончаров Денис Павлович
    employees[3].role = ROLES.SUPPLY_SPECIALIST; // Зиновьев Елисей Матвеевич
    employees[5].role = ROLES.SUPPLY_SPECIALIST; // Захаров Фёдор Егорович

    // Сохраняем всех сотрудников
    const savedEmployees = [];
    for (const employeeData of employees) {
      const employee = new User({
        ...employeeData,
        isVerified: true,
        hasCompletedRegistration: true
      });
      const savedEmployee = await employee.save();
      savedEmployees.push(savedEmployee);
      console.log('Сотрудник создан:', savedEmployee);
    }

    // Создание заявки
    const supplyRequest = new Supply({
      title: 'Заказ инструментов для ремонтной бригады №2',
      description: 'В связи с началом планового ремонта производственной линии требуется обновить комплект инструментов ремонтной бригады. Текущие инструменты имеют значительный износ и не позволяют выполнять работы с необходимым качеством.',
      priority: 'high',
      status: 'completed',
      deadline: new Date('2025-06-10T23:59:59.999Z'),
      items: [
        {
          name: 'Набор отверток прецизионных',
          quantity: 3,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Ключи гаечные комбинированные 8-24 мм',
          quantity: 2,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Мультиметр цифровой',
          quantity: 2,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Дрель-шуруповерт аккумуляторная',
          quantity: 1,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Перчатки монтажные противоскользящие',
          quantity: 10,
          unit: 'шт',
          purchased: true
        }
      ],
      createdBy: {
        userId: savedEmployees[0]._id,
        name: `${savedEmployees[0].lastName} ${savedEmployees[0].firstName} ${savedEmployees[0].middleName}`
      }
    });

    await supplyRequest.save();
    console.log('Заявка создана:', supplyRequest);

    // Создание заявки на спецодежду
    const supplyRequest2 = new Supply({
      title: 'Закупка спецодежды для сотрудников склада',
      description: 'В соответствии с нормами охраны труда и в связи с сезонной заменой спецодежды требуется обеспечить сотрудников складского комплекса новыми комплектами рабочей одежды. Старые комплекты имеют значительный износ и не соответствуют требованиям безопасности.',
      priority: 'low',
      status: 'new',
      deadline: new Date('2025-06-26T23:59:59.999Z'),
      items: [
        {
          name: 'Костюм рабочий летний (куртка + брюки)',
          quantity: 8,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Обувь рабочая защитная с металлическим подноском',
          quantity: 8,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Перчатки рабочие усиленные',
          quantity: 20,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Жилеты сигнальные светоотражающие',
          quantity: 5,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Каски защитные',
          quantity: 3,
          unit: 'шт',
          purchased: false
        }
      ],
      createdBy: {
        userId: savedEmployees[2]._id,
        name: `${savedEmployees[2].lastName} ${savedEmployees[2].firstName} ${savedEmployees[2].middleName}`
      }
    });

    await supplyRequest2.save();
    console.log('Заявка на спецодежду создана:', supplyRequest2);

    // Создание заявки на оргтехнику
    const supplyRequest3 = new Supply({
      title: 'Приобретение оргтехники для нового офисного этажа',
      description: 'В связи с открытием дополнительного офисного этажа и расширением штата необходимо закупить компьютерную и офисную технику для оборудования 12 новых рабочих мест. Требуется базовая комплектация для стандартной офисной работы.',
      priority: 'high',
      status: 'in_progress',
      deadline: new Date('2025-06-08T23:59:59.999Z'),
      items: [
        {
          name: 'МФУ лазерное монохромное А4',
          quantity: 3,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Картриджи для МФУ (оригинальные)',
          quantity: 12,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Клавиатура USB проводная',
          quantity: 12,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Мышь компьютерная USB оптическая',
          quantity: 12,
          unit: 'шт',
          purchased: false
        },
        {
          name: 'Коврики для мыши 250x200мм',
          quantity: 12,
          unit: 'шт',
          purchased: true
        },
        {
          name: 'Сетевые фильтры на 6 розеток',
          quantity: 8,
          unit: 'шт',
          purchased: false
        }
      ],
      createdBy: {
        userId: savedEmployees[4]._id,
        name: `${savedEmployees[4].lastName} ${savedEmployees[4].firstName} ${savedEmployees[4].middleName}`
      }
    });

    await supplyRequest3.save();
    console.log('Заявка на оргтехнику создана:', supplyRequest3);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  }
}

initializeDatabase(); 