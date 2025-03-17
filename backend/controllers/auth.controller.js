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
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
  }

  static _validatePhoneNumber(phone) {
    return /^7\d{10}$/.test(phone);
  }

  static _handleServerError(res, error) {
    console.error('Server error:', error);
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
        'firstName lastName middleName email'
      );
      res.json(users);
    } catch (error) {
      AuthController._handleServerError(res, error);
    }
  }

  static async requestAuth(req, res) {
    try {
      const { phone } = req.body;

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

      const token = jwt.sign(
        { userId: user._id, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        token,
        user: {
          id: user._id,
          phone: user.phone,
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
        lastName: user.lastName,
        firstName: user.firstName,
        middleName: user.middleName,
        birthDate: user.birthDate,
        profilePhoto: user.profilePhoto,
        hasCompletedRegistration: user.hasCompletedRegistration
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
}

module.exports = AuthController;