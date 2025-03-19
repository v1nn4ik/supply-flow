const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middleware/auth.middleware');

// Применяем middleware авторизации ко всем маршрутам
router.use(verifyToken);

// Получить все задачи
router.get('/', taskController.getTasks);

// Получить задачи по пользователю (должен быть перед другими маршрутами с параметрами)
router.get('/user/:userId', taskController.getTasksByUser);

// Создать новую задачу
router.post('/', taskController.createTask);

// Обновить задачу
router.patch('/:taskId', taskController.updateTask);

// Удалить задачу
router.delete('/:taskId', taskController.deleteTask);

module.exports = router; 