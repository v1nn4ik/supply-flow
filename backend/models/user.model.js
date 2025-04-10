const mongoose = require('mongoose');
const ROLES = require('../constants/roles');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.EMPLOYEE
  },
  verificationCode: {
    type: String,
    default: null,
  },
  verificationCodeExpires: {
    type: Date,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  hasCompletedRegistration: {
    type: Boolean,
    default: false,
  },
  lastName: {
    type: String,
    default: null,
  },
  firstName: {
    type: String,
    default: null,
  },
  middleName: {
    type: String,
    default: null,
  },
  birthDate: {
    type: String,
    default: '',
  },
  profilePhoto: {
    type: String,
    default: null,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 