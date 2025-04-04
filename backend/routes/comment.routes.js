const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Middleware для обработки ошибок multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Размер файла превышает допустимый лимит в 7 МБ' });
    }
    return res.status(500).json({ message: 'Ошибка при загрузке файла', error: err.message });
  }
  next();
};

// Получение комментариев для конкретной заявки
router.get('/supply/:supplyId', verifyToken, commentController.getCommentsBySupply);

// Создание нового комментария
router.post('/', verifyToken, commentController.createComment);

// Создание комментария с вложением
router.post('/attachment', verifyToken, commentController.upload.single('file'), handleMulterError, commentController.createCommentWithAttachment);

// Маршрут для просмотра вложения (по ID комментария и имени файла)
router.get('/attachment/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const Comment = require('../models/comment.model');

    // Находим комментарий по ID
    const comment = await Comment.findById(commentId);
    if (!comment || !comment.attachment) {
      return res.status(404).send('Вложение не найдено');
    }

    // Получаем путь к файлу
    const attachmentUrl = comment.attachment.url;

    // Перенаправляем на URL статического файла
    res.redirect(`/${attachmentUrl}`);
  } catch (error) {
    console.error('Ошибка при получении вложения:', error);
    res.status(500).send('Ошибка при получении вложения');
  }
});

module.exports = router;
