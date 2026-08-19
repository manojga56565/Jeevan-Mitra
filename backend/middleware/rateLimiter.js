const rateLimit = require('express-rate-limit');

// General safety net applied to all /api routes in server.js
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please slow down and try again shortly.' }
});

// Tighter limit for OTP send, to stop SMS-cost abuse
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please wait a few minutes before trying again.' }
});

// Tighter limit on login endpoints to slow down credential stuffing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait before trying again.' }
});

module.exports = { generalLimiter, otpLimiter, loginLimiter };
