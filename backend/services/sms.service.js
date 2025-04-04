const axios = require('axios');

class SmsService {
  static async sendVerificationCode(phone, code) {
    try {
      console.log('Отправка SMS на номер:', phone, 'с кодом:', code);
      console.log('SMS_SENDER_NUMBER:', process.env.SMS_SENDER_NUMBER);
      
      // Форматируем номер телефона (убираем '+' если есть)
      const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
      
      const payload = {
        number: process.env.SMS_SENDER_NUMBER,
        destination: formattedPhone,
        text: `Ваш код подтверждения для входа на сайт Supply Flow: ${code}`
      };
      
      console.log('SMS payload:', JSON.stringify(payload));
      
      const response = await axios.post('https://api.exolve.ru/messaging/v1/SendSMS', payload, {
        headers: {
          'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('SMS API response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('SMS API Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
        console.error('Response headers:', JSON.stringify(error.response.headers));
      }
      throw new Error('Не удалось отправить SMS');
    }
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = SmsService; 