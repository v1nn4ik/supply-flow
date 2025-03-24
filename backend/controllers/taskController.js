const Task = require('../models/task.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const uploadDir = 'uploads/tasks';
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '-' + file.originalname);
	}
});

const upload = multer({ storage: storage });

// Получить все задачи
const getTasks = async (req, res) => {
	try {
		const tasks = await Task.find()
			.sort({ createdAt: -1 });
		res.json(tasks);
	} catch (error) {
		res.status(500).json({ message: 'Ошибка при получении задач' });
	}
};

// Получить задачу по ID
const getTaskById = async (req, res) => {
	try {
		const task = await Task.findById(req.params.taskId);

		if (!task) {
			return res.status(404).json({ message: 'Задача не найдена' });
		}

		res.json(task);
	} catch (error) {
		res.status(500).json({ message: 'Ошибка при получении задачи' });
	}
};

// Получить задачи по пользователю
const getTasksByUser = async (req, res) => {
	try {
		const userId = req.params.userId;
		const tasks = await Task.find({ assignedTo: userId })
			.sort({ createdAt: -1 });
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
		const userId = req.user._id; // Предполагается, что у нас есть middleware для аутентификации

		// Получаем текущую задачу для сравнения изменений
		const currentTask = await Task.findById(taskId);
		if (!currentTask) {
			return res.status(404).json({ message: 'Задача не найдена' });
		}

		// Создаем запись в истории изменений
		const historyEntry = {
			field: Object.keys(updates)[0],
			oldValue: currentTask[Object.keys(updates)[0]],
			newValue: updates[Object.keys(updates)[0]],
			changedBy: userId
		};

		// Добавляем историю к обновлениям
		updates.$push = { history: historyEntry };

		const updatedTask = await Task.findByIdAndUpdate(
			taskId,
			updates,
			{ new: true }
		);

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
		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(404).json({ message: 'Задача не найдена' });
		}

		// Удаляем прикрепленные файлы
		if (task.attachments && task.attachments.length > 0) {
			task.attachments.forEach(attachment => {
				const filePath = path.join(__dirname, '..', attachment.url);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			});
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

// Добавить комментарий к задаче
const addComment = async (req, res) => {
	try {
		const taskId = req.params.taskId;
		const { text } = req.body;
		const userId = req.user._id;

		const comment = {
			text,
			author: userId
		};

		const updatedTask = await Task.findByIdAndUpdate(
			taskId,
			{ $push: { comments: comment } },
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
		res.status(500).json({ message: 'Ошибка при добавлении комментария' });
	}
};

// Загрузить файл для задачи
const uploadAttachment = async (req, res) => {
	try {
		const taskId = req.params.taskId;
		const file = req.file;
		const userId = req.user._id;

		if (!file) {
			return res.status(400).json({ message: 'Файл не был загружен' });
		}

		const attachment = {
			name: file.originalname,
			url: file.path,
			type: file.mimetype,
			size: file.size,
			uploadedBy: userId
		};

		const updatedTask = await Task.findByIdAndUpdate(
			taskId,
			{ $push: { attachments: attachment } },
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
		res.status(500).json({ message: 'Ошибка при загрузке файла' });
	}
};

// Удалить файл задачи
const deleteAttachment = async (req, res) => {
	try {
		const taskId = req.params.taskId;
		const attachmentId = req.params.attachmentId;

		const task = await Task.findById(taskId);
		if (!task) {
			return res.status(404).json({ message: 'Задача не найдена' });
		}

		const attachment = task.attachments.id(attachmentId);
		if (!attachment) {
			return res.status(404).json({ message: 'Файл не найден' });
		}

		// Удаляем файл с диска
		const filePath = path.join(__dirname, '..', attachment.url);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}

		// Удаляем файл из базы данных
		attachment.remove();
		await task.save();

		// Отправляем уведомление через WebSocket
		const io = req.app.get('emitTaskUpdate');
		if (io) {
			io(task);
		}

		res.json(task);
	} catch (error) {
		res.status(500).json({ message: 'Ошибка при удалении файла' });
	}
};

module.exports = {
	getTasks,
	getTaskById,
	getTasksByUser,
	createTask,
	updateTask,
	deleteTask,
	addComment,
	uploadAttachment,
	deleteAttachment,
	upload
};
