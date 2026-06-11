const { verifyToken } = require('../utils/jwt');

/**
 * Middleware: validates a user Bearer JWT and attaches req.user.
 */
module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required.',
    });
  }

  try {
    const payload = verifyToken(authHeader.split(' ')[1]);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};
