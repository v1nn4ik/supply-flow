const mongoose = require('mongoose');

// Схема для вложений
const attachmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  originalName: {
    type: String
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String
  },
  size: {
    type: Number
  }
});

const commentSchema = new mongoose.Schema({
  supplyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supply',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  // Добавляем поле для вложения (файла)
  attachment: {
    type: attachmentSchema,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', commentSchema); 