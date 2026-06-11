const createRateLimit = require('express-rate-limit');

/**
 * General rate limiter — 300 requests per 15 min per IP
 * Auth routes are excluded (signup/login should never be blocked)
 */
const rateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for user auth routes entirely
    return req.path.startsWith('/api/auth');
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Stricter limiter for admin login — 20 requests per 15 min per IP
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
