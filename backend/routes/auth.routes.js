const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { validatePhoneNumber, verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Маршрут для запроса авторизации (отправка SMS)
router.post('/request', validatePhoneNumber, AuthController.requestAuth);

// Маршрут для повторной отправки кода
router.post('/resend', validatePhoneNumber, AuthController.resendCode);

// Маршрут для проверки кода подтверждения
router.post('/verify', validatePhoneNumber, AuthController.verifyCode);

// Маршрут для проверки статуса верификации (защищенный)
router.get('/status', verifyToken, AuthController.checkVerificationStatus);

// Маршруты для работы с данными пользователя (защищенные)
router.get('/user/data', verifyToken, AuthController.getUserData);
router.post('/user/data', verifyToken, AuthController.updateUserData);

// Маршрут для получения списка всех пользователей (только для разработки)
router.get('/users', AuthController.getAllUsers);

// Новый маршрут для проверки пользователя
router.post('/check-user', AuthController.checkUser);

// Новый маршрут для получения статуса верификации
router.get('/check-verification', AuthController.checkVerificationStatus);

module.exports = router; 