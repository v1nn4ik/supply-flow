const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const SmsService = require('../services/sms.service');

// Константы для управления временем
const RESEND_TIMEOUT = 2 * 60 * 1000; // 2 минуты в миллисекундах

class AuthController {
  static async requestAuth(req, res) {
    try {
      const { phone } = req.body;

      // Проверяем, не отправляли ли мы код недавно
      const existingUser = await User.findOne({ phone });
      if (existingUser && existingUser.verificationCodeExpires > new Date()) {
        const timeLeft = Math.ceil((existingUser.verificationCodeExpires - new Date()) / 1000);
        return res.status(400).json({ 
          message: `Повторная отправка кода будет доступна через ${timeLeft} секунд`,
          timeLeft: timeLeft
        });
      }

      // Генерируем код верификации
      const verificationCode = SmsService.generateVerificationCode();
      const verificationCodeExpires = new Date(Date.now() + RESEND_TIMEOUT);

      // Создаем или обновляем пользователя
      let user = existingUser || new User({ phone });
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      user.isVerified = false;
      await user.save();

      // Отправляем SMS
      await SmsService.sendVerificationCode(phone, verificationCode);

      res.json({ 
        message: 'Код подтверждения успешно отправлен',
        resendAvailable: new Date(Date.now() + RESEND_TIMEOUT)
      });
    } catch (error) {
      console.error('Ошибка запроса авторизации:', error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
  }

  static async resendCode(req, res) {
    try {
      const { phone } = req.body;

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Проверяем, не отправляли ли мы код недавно
      if (user.verificationCodeExpires > new Date()) {
        const timeLeft = Math.ceil((user.verificationCodeExpires - new Date()) / 1000);
        return res.status(400).json({ 
          message: `Повторная отправка кода будет доступна через ${timeLeft} секунд`,
          timeLeft: timeLeft
        });
      }

      // Генерируем новый код
      const verificationCode = SmsService.generateVerificationCode();
      const verificationCodeExpires = new Date(Date.now() + RESEND_TIMEOUT);

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await user.save();

      // Отправляем SMS
      await SmsService.sendVerificationCode(phone, verificationCode);

      res.json({ 
        message: 'Код подтверждения успешно отправлен повторно',
        resendAvailable: new Date(Date.now() + RESEND_TIMEOUT)
      });
    } catch (error) {
      console.error('Ошибка повторной отправки кода:', error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
  }

  static async verifyCode(req, res) {
    try {
      const { phone, code } = req.body;

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

      // Очищаем код верификации и помечаем пользователя как верифицированного
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      user.isVerified = true;
      await user.save();

      // Создаем JWT токен
      const token = jwt.sign(
        { userId: user._id, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token, user: { id: user._id, phone: user.phone } });
    } catch (error) {
      console.error('Ошибка верификации кода:', error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера' });
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
      console.error('Ошибка проверки статуса верификации:', error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
  }

  static async getAllUsers(req, res) {
    try {
      const users = await User.find({}, {
        phone: 1,
        isVerified: 1,
        verificationCodeExpires: 1,
        createdAt: 1,
        updatedAt: 1
      });

      res.json({
        totalUsers: users.length,
        users: users.map(user => ({
          phone: user.phone,
          isVerified: user.isVerified,
          canResendCode: user.verificationCodeExpires ? user.verificationCodeExpires < new Date() : true,
          createdAt: user.createdAt,
          lastUpdate: user.updatedAt
        }))
      });
    } catch (error) {
      console.error('Ошибка получения списка пользователей:', error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
  }
}

module.exports = AuthController; 