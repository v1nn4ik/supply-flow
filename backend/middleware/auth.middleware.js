const jwt = require('jsonwebtoken');

// Валидация номера телефона (только количество цифр)
const validatePhoneNumber = (req, res, next) => {
  const { phone } = req.body;
  
  console.log('Получен номер телефона:', phone);
  console.log('Тип номера:', typeof phone);
  
  if (!phone) {
    return res.status(400).json({ message: 'Необходимо указать номер телефона' });
  }

  // Убираем все нецифровые символы
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Проверяем только длину номера (11 цифр)
  if (cleanPhone.length !== 11) {
    return res.status(400).json({ 
      message: 'Номер телефона должен содержать 11 цифр' 
    });
  }

  // Сохраняем очищенный номер
  req.body.phone = cleanPhone;
  
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