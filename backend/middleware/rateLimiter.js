const rateLimit = require('express-rate-limit');

// OTP send: the one most worth protecting — without this, someone could
// script thousands of "send OTP" requests to a single phone number (or
// spray across many numbers) and effectively spam-bomb it, or exhaust
// whatever SMS quota a real provider would eventually be wired in with.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 OTP requests per IP per window
  message: { success: false, message: 'Too many OTP requests — please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Login endpoints (hospital/admin password login): slows down brute-force
// password guessing without blocking a normal person who just mistypes
// their password a couple of times.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts — please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API-wide safety net — generous enough that it never affects
// normal use, just stops a runaway script or scraper from hammering the
// whole API.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { otpLimiter, loginLimiter, generalLimiter };
