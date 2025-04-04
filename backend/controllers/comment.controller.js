const Comment = require('../models/comment.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Используем путь относительно корня проекта
    const uploadDir = path.join(__dirname, '..', 'uploads', 'comments');
    // Создаем папку, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Получаем расширение файла из оригинального имени
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    // Получаем тип файла для формирования имени
    let fileType = '';
    
    if (file.mimetype.includes('image')) {
      fileType = 'image';
    } else if (file.mimetype.includes('pdf')) {
      fileType = 'pdf';
    } else if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
      fileType = 'doc';
    } else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
      fileType = 'excel';
    } else if (file.mimetype.includes('presentation') || file.mimetype.includes('powerpoint')) {
      fileType = 'ppt';
    } else if (file.mimetype.includes('text')) {
      fileType = 'text';
    } else if (file.mimetype.includes('zip') || file.mimetype.includes('rar') || file.mimetype.includes('archive')) {
      fileType = 'archive';
    } else {
      fileType = 'file';
    }
    
    // Генерируем уникальный числовой идентификатор
    const uniqueId = Date.now() % 10000; // Берем последние 4 цифры таймстампа
    
    // Формируем новое имя файла
    const newFilename = `${fileType}${uniqueId}${fileExt}`;
    
    cb(null, newFilename);
  }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
  // Принимаем все типы файлов
  cb(null, true);
};

// Настройка multer с ограничением размера файла в 7МБ
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 7 * 1024 * 1024 // 7 МБ в байтах
  }
});

// Экспортируем multer для использования в маршрутах
exports.upload = upload;

const getCommentsBySupply = async (req, res) => {
  try {
    const { supplyId } = req.params;
    
    if (!supplyId) {
      return res.status(400).json({ message: 'ID заявки обязателен' });
    }

    let supplyObjectId;
    try {
      supplyObjectId = new mongoose.Types.ObjectId(supplyId);
    } catch (err) {
      return res.status(400).json({ message: 'Неверный формат ID заявки' });
    }
    
    const comments = await Comment.find({ supplyId: supplyObjectId })
      .sort({ createdAt: 1 })
      .exec();
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении комментариев' });
  }
};

const createComment = async (req, res) => {
  try {
    const { supplyId, text } = req.body;
    const userId = req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Неверный токен авторизации' });
    }

    if (!supplyId) {
      return res.status(400).json({ message: 'ID заявки обязателен' });
    }

    let supplyObjectId;
    try {
      supplyObjectId = new mongoose.Types.ObjectId(supplyId);
    } catch (err) {
      return res.status(400).json({ message: 'Неверный формат ID заявки' });
    }

    let userName = "Пользователь";
    try {
      const user = await User.findById(userId);
      if (user) {
        userName = `${user.lastName || ''} ${user.firstName || ''}`.trim() || "Пользователь";
      } else if (req.user.phone) {
        userName = `Пользователь ${req.user.phone}`;
      }
    } catch (error) {
      // В случае ошибки используем имя по умолчанию
    }

    const comment = new Comment({
      supplyId: supplyObjectId,
      userId,
      userName,
      text
    });

    await comment.save();
    
    const io = req.app.get('io');
    if (io) {
      io.to(`supply-${supplyId}`).emit('new-comment', comment);
    }
    
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании комментария' });
  }
};

// Новый метод для создания комментария с вложением
const createCommentWithAttachment = async (req, res) => {
  try {
    const { supplyId, text } = req.body;
    const userId = req.user.userId;
    const file = req.file;
    
    if (!userId) {
      // Удаляем загруженный файл, если есть ошибка авторизации
      if (file && file.path) fs.unlinkSync(file.path);
      return res.status(401).json({ message: 'Неверный токен авторизации' });
    }

    if (!supplyId) {
      // Удаляем загруженный файл, если не указан supplyId
      if (file && file.path) fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'ID заявки обязателен' });
    }

    if (!file) {
      return res.status(400).json({ message: 'Файл не был загружен' });
    }

    let supplyObjectId;
    try {
      supplyObjectId = new mongoose.Types.ObjectId(supplyId);
    } catch (err) {
      // Удаляем загруженный файл при ошибке формата ID
      if (file && file.path) fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Неверный формат ID заявки' });
    }

    let userName = "Пользователь";
    try {
      const user = await User.findById(userId);
      if (user) {
        userName = `${user.lastName || ''} ${user.firstName || ''}`.trim() || "Пользователь";
      } else if (req.user.phone) {
        userName = `Пользователь ${req.user.phone}`;
      }
    } catch (error) {
      // В случае ошибки используем имя по умолчанию
    }

    // Получаем абсолютный путь к файлу
    const absolutePath = path.resolve(file.path);
    console.log(`Абсолютный путь к загруженному файлу: ${absolutePath}`);
    
    // Создаем относительный путь для доступа через веб (от корня проекта)
    const relativePath = 'uploads/comments/' + path.basename(file.path);
    
    // Получаем системное имя файла (имя файла на диске)
    const systemFileName = path.basename(file.path);
    console.log(`Сохраняем относительный путь: ${relativePath}, системное имя файла: ${systemFileName}`);

    // Создаем объект вложения
    const attachment = {
      name: systemFileName, // Сохраняем системное имя файла для отображения
      originalName: file.originalname, // Сохраняем оригинальное имя как дополнительное поле
      url: relativePath,
      type: file.mimetype,
      size: file.size
    };

    const comment = new Comment({
      supplyId: supplyObjectId,
      userId,
      userName,
      text: text || 'Прикреплен файл',
      attachment: attachment
    });

    await comment.save();
    console.log(`Создан комментарий ID: ${comment._id} с вложением: ${systemFileName}`);
    
    const io = req.app.get('io');
    if (io) {
      io.to(`supply-${supplyId}`).emit('new-comment', comment);
    }
    
    res.status(201).json(comment);
  } catch (error) {
    // В случае ошибки удаляем загруженный файл
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`Удален временный файл после ошибки: ${req.file.path}`);
      } catch (unlinkError) {
        console.error('Ошибка при удалении файла:', unlinkError);
      }
    }
    console.error('Ошибка при создании комментария с вложением:', error);
    res.status(500).json({ message: 'Ошибка при создании комментария с вложением' });
  }
};

module.exports = {
  getCommentsBySupply,
  createComment,
  createCommentWithAttachment,
  upload
};