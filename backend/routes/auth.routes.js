const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AuthController = require('../controllers/auth.controller');
const { validatePhoneNumber, verifyToken } = require('../middleware/auth.middleware');
const { isManagerOrAdmin } = require('../middleware/authRole');

const router = express.Router();

// Настроим хранилище для загрузки фото
const uploadsDir = path.join(__dirname, '../uploads');

// Создаем директорию, если она не существует
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
    // Разрешаем только изображения
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Разрешены только изображения'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // ограничение 5MB
    }
});

// Маршрут для запроса авторизации (отправка SMS)
router.post('/request', validatePhoneNumber, AuthController.requestAuth);

// Маршрут для повторной отправки кода
router.post('/resend', validatePhoneNumber, AuthController.resendCode);

// Маршрут для проверки кода подтверждения
router.post('/verify', validatePhoneNumber, AuthController.verifyCode);

// Маршрут для проверки статуса верификации (защищенный)
router.get('/status', verifyToken, AuthController.checkVerificationStatus);

// Маршруты для работы с данными пользователя (защищенные)
router.get('/user/data', verifyToken, AuthController.getUserData);
router.post('/user/data', verifyToken, AuthController.updateUserData);

// Маршруты для работы с фото профиля
router.post('/user/photo', verifyToken, upload.single('profilePhoto'), AuthController.uploadProfilePhoto);
router.delete('/user/photo', verifyToken, AuthController.deleteProfilePhoto);

// Маршрут для получения списка всех пользователей (защищенный)
router.get('/users', verifyToken, AuthController.getAllUsers);

// Маршрут для обновления роли пользователя (только для админов и менеджеров)
router.post('/users/:userId/role', verifyToken, isManagerOrAdmin, AuthController.updateUserRole);
// Альтернативный маршрут для обновления роли пользователя
router.put('/user/role', verifyToken, isManagerOrAdmin, AuthController.updateUserRole);

// Маршрут для проверки пользователя
router.post('/check-user', AuthController.checkUser);

// Маршрут для получения статуса верификации
router.get('/check-verification', AuthController.checkVerificationStatus);

// Маршрут для создания тестового пользователя-специалиста снабжения (только в dev-окружении)
if (process.env.NODE_ENV !== 'production') {
    router.get('/create-supply-specialist', AuthController.createSupplySpecialist);
}

module.exports = router;
