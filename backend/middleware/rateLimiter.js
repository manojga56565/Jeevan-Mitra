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

// Tighter limit on login endpoints to slow down credential stuffing.
// Keyed by the account identifier (email/phone) rather than IP — IP-based
// keying meant one flaky tester (or anyone sharing a college/office
// network) could lock out every other real user on the same IP. Keying by
// identifier still stops credential stuffing against a single account,
// without collateral-damaging everyone else on that network.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = (req.body?.email || req.body?.phone || req.body?.identifier || '').toString().trim().toLowerCase();
    // Fall back to IP only if no identifier was submitted at all (e.g. malformed request).
    return id || req.ip;
  },
  message: { success: false, message: 'Too many login attempts for this account. Please wait before trying again.' }
});

module.exports = { generalLimiter, otpLimiter, loginLimiter };
