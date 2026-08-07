const { OTP_LENGTH, OTP_EXPIRY_MS } = require('../config/constants');

function generateOTP() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min)).toString();
}

function getExpiryTimestamp() {
  return Date.now() + OTP_EXPIRY_MS;
}

function isExpired(expiryTimestamp) {
  return Date.now() > expiryTimestamp;
}

module.exports = { generateOTP, getExpiryTimestamp, isExpired };
