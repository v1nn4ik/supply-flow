const Comment = require('../models/comment.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

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

module.exports = {
  getCommentsBySupply,
  createComment
};