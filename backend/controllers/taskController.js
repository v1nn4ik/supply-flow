const Task = require('../models/task.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Получить все задачи
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении задач' });
  }
};

// Получить задачи по пользователю
const getTasksByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const tasks = await Task.find({ assignedTo: userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении задач пользователя' });
  }
};

// Создать новую задачу
const createTask = async (req, res) => {
  try {
    const task = new Task(req.body);
    const savedTask = await task.save();
    
    // Отправляем уведомление через WebSocket
    const io = req.app.get('emitNewTask');
    if (io) {
      io(savedTask);
    }
    
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании задачи' });
  }
};

// Обновить задачу
const updateTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const updates = req.body;
    
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true }
    );
    
    if (!updatedTask) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }
    
    // Отправляем уведомление через WebSocket
    const io = req.app.get('emitTaskUpdate');
    if (io) {
      io(updatedTask);
    }
    
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении задачи' });
  }
};

// Удалить задачу
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const deletedTask = await Task.findByIdAndDelete(taskId);
    
    if (!deletedTask) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }
    
    // Отправляем уведомление через WebSocket
    const io = req.app.get('emitTaskDelete');
    if (io) {
      io(taskId);
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении задачи' });
  }
};

module.exports = {
  getTasks,
  getTasksByUser,
  createTask,
  updateTask,
  deleteTask
}; 