const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth.routes');
const supplyRoutes = require('./routes/supply.routes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/comment.routes');

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Настройка Socket.IO до middleware
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:4200', 'https://supplyflow.ru', 'http://89.111.169.226'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'https://supplyflow.ru', 'http://89.111.169.226'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настраиваем статические файлы для доступа к загруженным изображениям
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Дополнительно выводим информацию о пути к директории с загруженными файлами
console.log(`Статические файлы (uploads) доступны по пути: ${path.join(__dirname, 'uploads')}`);

// Добавляем обработчик для отладки запросов к статическим файлам
app.use((req, res, next) => {
  if (req.url.startsWith('/uploads')) {
    console.log(`Запрос к статическому файлу: ${req.url}`);
  }
  next();
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);

// Путь к собранным файлам Angular
const angularDistPath = path.join(__dirname, '../dist/supply-flow/browser');

// Настройка статических файлов Angular
app.use(express.static(angularDistPath));

// Все остальные маршруты направляем на Angular
app.get('*', (req, res) => {
  // Исключаем API-запросы
  if (!req.url.startsWith('/api/')) {
    res.sendFile(path.join(angularDistPath, 'index.html'));
  }
});

// Socket.IO обработчики
io.on('connection', (socket) => {
  socket.on('join-supply', (supplyId) => {
    if (supplyId) {
      const room = `supply-${supplyId}`;
      socket.join(room);
    }
  });

  socket.on('leave-supply', (supplyId) => {
    if (supplyId) {
      const room = `supply-${supplyId}`;
      socket.leave(room);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket.IO ошибка:', error);
  });
});

// Делаем io доступным для использования в других модулях
app.set('io', io);

// Функция для отправки обновлений заявок
const emitSupplyUpdate = (supply) => {
  if (io) {
    // Отправляем всем подключенным клиентам
    io.emit('supply-update', supply);
    // Отправляем в комнату конкретной заявки
    io.to(`supply-${supply._id}`).emit('supply-details-update', supply);
  }
};

// Функция для отправки обновлений задач
const emitTaskUpdate = (task) => {
  if (io) {
    // Отправляем всем подключенным клиентам
    io.emit('task-update', task);
  }
};

// Функция для отправки уведомления о новой задаче
const emitNewTask = (task) => {
  if (io) {
    io.emit('new-task', task);
  }
};

// Функция для отправки уведомления об удалении задачи
const emitTaskDelete = (taskId) => {
  if (io) {
    io.emit('task-delete', taskId);
  }
};

// Делаем функции доступными для использования в других модулях
app.set('emitSupplyUpdate', emitSupplyUpdate);
app.set('emitTaskUpdate', emitTaskUpdate);
app.set('emitNewTask', emitNewTask);
app.set('emitTaskDelete', emitTaskDelete);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;