const jwt = require('jsonwebtoken');

// Валидация номера телефона (Российский формат)
const validatePhoneNumber = (req, res, next) => {
  const { phone } = req.body;
  const phoneRegex = /^7[9][0-9]{9}$/;

  if (!phone) {
    return res.status(400).json({ message: 'Необходимо указать номер телефона' });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ 
      message: 'Неверный формат номера телефона. Используйте формат: 79XXXXXXXXX' 
    });
  }

  next();
};

// Проверка JWT токена
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Отсутствует токен авторизации' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
};

module.exports = {
  validatePhoneNumber,
  verifyToken
}; 