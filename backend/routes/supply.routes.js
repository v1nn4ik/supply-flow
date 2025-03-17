const express = require('express');
const router = express.Router();
const supplyController = require('../controllers/supply.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Все маршруты защищены middleware авторизации
router.use(verifyToken);

// Получение списка заявок
router.get('/', supplyController.getSupplies);

// Создание новой заявки
router.post('/', supplyController.createSupply);

// Обновление статуса заявки
router.patch('/:id/status', supplyController.updateSupplyStatus);

// Обновление заявки
router.patch('/:id', supplyController.updateSupply);

// Удаление заявки
router.delete('/:id', supplyController.deleteSupply);

module.exports = router; 