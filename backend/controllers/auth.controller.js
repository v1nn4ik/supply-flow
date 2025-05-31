const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const SmsService = require('../services/sms.service');
const fs = require('fs');
const path = require('path');

// Константы
const RESEND_TIMEOUT = 2 * 60 * 1000; // 2 минуты
const JWT_EXPIRATION = '7d';

class AuthController {
  // Вспомогательные методы
  static async _findUserByPhone(phone) {
    return await User.findOne({ phone });
  }

  static _getTimeLeft(expirationDate) {
    return Math.ceil((expirationDate - new Date()) / 1000);
  }

  static _createToken(user) {
    return jwt.sign(
      { userId: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
  }

  static _validatePhoneNumber(phone) {
    return /^7\d{10}$/.test(phone);
  }

  static _handleServerError(res, error) {
    console.error('Server error:', error);

    // Проверяем, является ли ошибка ошибкой валидации Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Ошибка валидации', details: errors });
    }

    // Проверяем, является ли ошибка ошибкой дублирования ключа MongoDB (например, для уникальных полей)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = Object.values(error.keyValue)[0];
      return res.status(400).json({ message: `Запись с таким ${field} (${value}) уже существует` });
    }

    // Для других типов ошибок отправляем общее сообщение
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }

  static _getUserPublicData(user) {
    return {
      lastName: user.lastName,
      firstName: user.firstName,
      middleName: user.middleName,
      birthDate: user.birthDate,
      profilePhoto: user.profilePhoto,
      hasCompletedRegistration: user.hasCompletedRegistration
    };
  }

  // Основные методы контроллера
  static async getAllUsers(req, res) {
    try {
      const users = await User.find(
        { hasCompletedRegistration: true },
        'firstName lastName middleName email role phone profilePhoto'
      );
      res.json(users);
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async requestAuth(req, res) {
    try {
      const { phone } = req.body;

      // Проверка на специальные номера для быстрого входа без СМС
      if (phone === '79999999999' || phone === '77777777777') {
        // Для админов
        const adminUser = await User.findOne({ phone });
        if (adminUser) {
          const token = AuthController._createToken(adminUser);
          return res.json({
            token,
            user: {
              id: adminUser._id,
              phone: adminUser.phone,
              role: adminUser.role,
              lastName: adminUser.lastName,
              firstName: adminUser.firstName,
              middleName: adminUser.middleName,
              birthDate: adminUser.birthDate,
              profilePhoto: adminUser.profilePhoto,
              hasCompletedRegistration: adminUser.hasCompletedRegistration
            },
            isAdmin: true
          });
        }
      } else if (phone === '78888888888') {
        // Для специалиста снабжения - также без СМС
        const specialistUser = await User.findOne({ phone });
        if (specialistUser) {
          const token = AuthController._createToken(specialistUser);
          return res.json({
            token,
            user: {
              id: specialistUser._id,
              phone: specialistUser.phone,
              role: specialistUser.role,
              lastName: specialistUser.lastName,
              firstName: specialistUser.firstName,
              middleName: specialistUser.middleName,
              birthDate: specialistUser.birthDate,
              profilePhoto: specialistUser.profilePhoto,
              hasCompletedRegistration: specialistUser.hasCompletedRegistration
            },
            isSpecialist: true // Добавляем флаг для клиента
          });
        }
      }

      // Обычная авторизация с отправкой кода для всех остальных
      const existingUser = await User.findOne({ phone });
      if (existingUser && existingUser.verificationCodeExpires > new Date()) {
        const timeLeft = Math.ceil((existingUser.verificationCodeExpires - new Date()) / 1000);
        return res.status(400).json({
          message: `Повторная отправка кода будет доступна через ${timeLeft} секунд`,
          timeLeft
        });
      }

      const verificationCode = SmsService.generateVerificationCode();
      const verificationCodeExpires = new Date(Date.now() + RESEND_TIMEOUT);

      let user = existingUser || new User({ phone });
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      user.isVerified = false;
      await user.save();

      await SmsService.sendVerificationCode(phone, verificationCode);

      res.json({
        message: 'Код подтверждения успешно отправлен',
        timeLeft: RESEND_TIMEOUT / 1000
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async resendCode(req, res) {
    try {
      const { phone } = req.body;

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      if (user.verificationCodeExpires > new Date()) {
        const timeLeft = Math.ceil((user.verificationCodeExpires - new Date()) / 1000);
        return res.status(400).json({
          message: `Повторная отправка кода будет доступна через ${timeLeft} секунд`,
          timeLeft
        });
      }

      const verificationCode = SmsService.generateVerificationCode();
      const verificationCodeExpires = new Date(Date.now() + RESEND_TIMEOUT);

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await user.save();

      await SmsService.sendVerificationCode(phone, verificationCode);

      res.json({
        message: 'Код подтверждения успешно отправлен повторно',
        timeLeft: RESEND_TIMEOUT / 1000
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async verifyCode(req, res) {
    try {
      const { phone, code, lastName, firstName, middleName } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: 'Необходимо указать номер телефона и код' });
      }

      const user = await User.findOne({
        phone,
        verificationCode: code,
        verificationCodeExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Неверный или просроченный код' });
      }

      const currentUserData = {
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        birthDate: user.birthDate,
        profilePhoto: user.profilePhoto,
        hasCompletedRegistration: user.hasCompletedRegistration
      };

      user.verificationCode = null;
      user.verificationCodeExpires = null;
      user.isVerified = true;

      if (lastName && firstName && !currentUserData.hasCompletedRegistration) {
        user.lastName = lastName;
        user.firstName = firstName;
        user.middleName = middleName || '';
        user.birthDate = '';
        user.hasCompletedRegistration = true;
      } else {
        user.lastName = currentUserData.lastName;
        user.firstName = currentUserData.firstName;
        user.middleName = currentUserData.middleName;
        user.birthDate = currentUserData.birthDate;
        user.profilePhoto = currentUserData.profilePhoto;
        user.hasCompletedRegistration = currentUserData.hasCompletedRegistration;
      }

      await user.save();

      const token = AuthController._createToken(user);

      res.json({
        token,
        user: {
          id: user._id,
          phone: user.phone,
          role: user.role,
          lastName: user.lastName,
          firstName: user.firstName,
          middleName: user.middleName,
          birthDate: user.birthDate,
          profilePhoto: user.profilePhoto,
          hasCompletedRegistration: user.hasCompletedRegistration
        }
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async checkUser(req, res) {
    try {
      const { phone } = req.body;
      const user = await User.findOne({ phone });

      if (user && user.hasCompletedRegistration) {
        res.json({
          hasUserData: true,
          userData: {
            lastName: user.lastName,
            firstName: user.firstName,
            middleName: user.middleName,
            birthDate: user.birthDate,
            profilePhoto: user.profilePhoto
          }
        });
      } else {
        res.json({
          hasUserData: false
        });
      }
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async getUserData(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      res.json({
        _id: user._id,
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        birthDate: user.birthDate,
        profilePhoto: user.profilePhoto,
        hasCompletedRegistration: user.hasCompletedRegistration,
        role: user.role
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async checkVerificationStatus(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      res.json({
        isVerified: user.isVerified,
        phone: user.phone
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async updateUserData(req, res) {
    try {
      const { lastName, firstName, middleName, birthDate } = req.body;

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Обновляем данные пользователя
      user.lastName = lastName;
      user.firstName = firstName;
      user.middleName = middleName || '';
      user.birthDate = birthDate || '';
      user.hasCompletedRegistration = true;

      await user.save();

      const savedUser = {
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        birthDate: user.birthDate,
        profilePhoto: user.profilePhoto,
        hasCompletedRegistration: user.hasCompletedRegistration
      };

      res.json(savedUser);
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async uploadProfilePhoto(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Файл не загружен' });
      }

      const user = await User.findById(req.user.userId);

      if (!user) {
        // Удаляем загруженный файл, если пользователь не найден
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Если у пользователя уже было фото, удаляем старый файл
      if (user.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', 'uploads', path.basename(user.profilePhoto));
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      // Создаем URL фото для доступа через HTTP
      const photoUrl = `/uploads/${req.file.filename}`;

      // Обновляем данные пользователя
      user.profilePhoto = photoUrl;
      await user.save();

      res.json({
        message: 'Фото профиля успешно загружено',
        profilePhoto: photoUrl
      });
    } catch (error) {
      // Пытаемся удалить загруженный файл в случае ошибки
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Ошибка при удалении файла:', e);
        }
      }
      this._handleServerError(res, error);
    }
  }

  static async deleteProfilePhoto(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Если у пользователя есть фото, удаляем его
      if (user.profilePhoto) {
        const photoPath = path.join(__dirname, '..', 'uploads', path.basename(user.profilePhoto));
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }

        // Очищаем ссылку на фото в профиле пользователя
        user.profilePhoto = null;
        await user.save();
      }

      res.json({ message: 'Фото профиля успешно удалено' });
    } catch (error) {
      this._handleServerError(res, error);
    }
  }

  // Метод для создания тестового пользователя с ролью специалиста снабжения
  static async createSupplySpecialist(req, res) {
    try {
      const ROLES = require('../constants/roles');
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

      res.json({
        success: true,
        message: 'Supply specialist user created/updated successfully',
        user: {
          phone: user.phone,
          role: user.role,
          name: `${user.lastName} ${user.firstName} ${user.middleName}`
        }
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async updateUserRole(req, res) {
    try {
      // Получаем userId либо из параметров URL, либо из тела запроса
      const userId = req.params.userId || req.body.userId;
      // Получаем роль из тела запроса
      const { role } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'Не указан ID пользователя' });
      }

      // Проверяем допустимость роли
      const ROLES = require('../constants/roles');
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ message: 'Некорректная роль' });
      }

      // Находим пользователя
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Запрещаем менеджерам изменять роли администраторов
      if (req.user.role === ROLES.MANAGER && user.role === ROLES.ADMIN) {
        return res.status(403).json({ message: 'У вас нет прав изменять роль администратора' });
      }

      // Запрещаем изменять роль самому себе
      if (req.user.userId && req.user.userId.toString() === userId) {
        return res.status(403).json({ message: 'Вы не можете изменять свою собственную роль' });
      }

      // Обновляем роль
      user.role = role;
      await user.save();

      console.log(`Роль пользователя ${userId} изменена на ${role}`);

      res.json({ message: 'Роль пользователя успешно обновлена' });

    } catch (error) {
      console.error('Ошибка при обновлении роли:', error);
      AuthController._handleServerError(res, error);
    }
  }

  static async createUser(req, res) {
    try {
      const { lastName, firstName, middleName, phone, birthDate, role } = req.body;

      // Проверяем обязательные поля
      if (!lastName || !firstName || !phone) {
        return res.status(400).json({ message: 'Необходимо указать фамилию, имя и телефон' });
      }

      // Проверяем, существует ли пользователь с таким телефоном
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'Пользователь с таким номером телефона уже существует' });
      }

      // Создаем нового пользователя
      const user = new User({
        phone,
        lastName,
        firstName,
        middleName: middleName || '',
        birthDate: birthDate || '',
        role: role || ROLES.EMPLOYEE,
        isVerified: true,
        hasCompletedRegistration: true
      });

      await user.save();

      res.status(201).json({
        message: 'Пользователь успешно создан',
        user: {
          _id: user._id,
          lastName: user.lastName,
          firstName: user.firstName,
          middleName: user.middleName,
          phone: user.phone,
          birthDate: user.birthDate,
          role: user.role
        }
      });
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }
}

module.exports = AuthController;