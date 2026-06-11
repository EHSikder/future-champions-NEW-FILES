const createRateLimit = require('express-rate-limit');

/**
 * General rate limiter — 100 requests per 15 min per IP
 */
const rateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Stricter limiter for auth endpoints — 20 requests per 15 min per IP
 */
const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

module.exports = { rateLimit, authLimiter };
