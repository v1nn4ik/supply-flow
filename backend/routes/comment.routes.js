const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Получение комментариев для конкретной заявки
router.get('/supply/:supplyId', verifyToken, commentController.getCommentsBySupply);

// Создание нового комментария
router.post('/', verifyToken, commentController.createComment);

module.exports = router; 