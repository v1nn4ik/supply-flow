const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Маршрут для создания нового пользователя
// Используем метод createUser из AuthController
router.post('/', AuthController.createUser);

// Возможно, здесь будут другие маршруты для пользователей (GET, PUT, DELETE)
// router.get('/', AuthController.getAllUsers); // Пример маршрута GET

module.exports = router; 