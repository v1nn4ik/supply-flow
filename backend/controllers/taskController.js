const Task = require('../models/Task');

// Получить все задачи
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении задач', error: error.message });
  }
};

// Получить задачи по пользователю
exports.getTasksByUser = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении задач пользователя', error: error.message });
  }
};

// Создать новую задачу
exports.createTask = async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при создании задачи', error: error.message });
  }
};

// Обновить задачу
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при обновлении задачи', error: error.message });
  }
};

// Удалить задачу
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Задача не найдена' });
    }
    res.json({ message: 'Задача успешно удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении задачи', error: error.message });
  }
}; 