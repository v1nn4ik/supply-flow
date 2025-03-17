const axios = require('axios');

class SmsService {
  static async sendVerificationCode(phone, code) {
    try {
      const response = await axios.post('https://api.exolve.ru/messaging/v1/SendSMS', {
        number: process.env.SMS_SENDER_NUMBER,
        destination: phone,
        text: `Ваш код подтверждения: ${code}`
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error('Не удалось отправить SMS');
    }
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = SmsService; 