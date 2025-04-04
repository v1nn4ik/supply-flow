const express = require('express');
const router = express.Router();
const supplyController = require('../controllers/supply.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { isAnyRole, isSupplySpecialistOrHigher } = require('../middleware/authRole');

// Все маршруты защищены middleware авторизации
router.use(verifyToken);

// Получение списка заявок (доступно всем)
router.get('/', isAnyRole, supplyController.getSupplies);

// Получение списка собственных заявок (доступно всем)
router.get('/my', isAnyRole, supplyController.getMySupplies);

// Создание новой заявки (может любая роль)
router.post('/', isAnyRole, supplyController.createSupply);

// Обновление статуса заявки (нужны права специалиста снабжения или выше)
router.patch('/:id/status', isSupplySpecialistOrHigher, supplyController.updateSupplyStatus);

// Обновление заявки (нужны права специалиста снабжения или выше)
router.patch('/:id', isSupplySpecialistOrHigher, supplyController.updateSupply);

// Удаление заявки (нужны права специалиста снабжения или выше)
router.delete('/:id', isSupplySpecialistOrHigher, supplyController.deleteSupply);

// Загрузка вложений к заявке
router.post('/:supplyId/attachments', isAnyRole, supplyController.upload.single('file'), supplyController.uploadAttachment);

// Удаление вложения из заявки
router.delete('/:supplyId/attachments/:attachmentId', isAnyRole, supplyController.deleteAttachment);

module.exports = router; 