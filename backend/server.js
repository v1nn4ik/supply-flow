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

dotenv.config({ path: './.env' });

const app = express();
const httpServer = createServer(app);

// Настройка Socket.IO до middleware
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настраиваем статические файлы для доступа к загруженным изображениям
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Подключение к MongoDB успешно установлено'))
  .catch((err) => console.error('Ошибка подключения к MongoDB:', err));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/supply', supplyRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);

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

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });