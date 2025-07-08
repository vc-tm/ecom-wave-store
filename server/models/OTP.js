
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 300 // 5 minutes
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OTP', otpSchema);
