const createRateLimit = require('express-rate-limit');

/**
 * General rate limiter — 300 requests per 15 min per IP
 * Auth routes are excluded (handled separately in index.js)
 */
const rateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for auth routes entirely
    return req.path.startsWith('/api/auth');
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

module.exports = { rateLimit };
