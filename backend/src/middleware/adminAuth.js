const { verifyAdminToken } = require('../utils/jwt');

/**
 * Middleware: validates an admin Bearer JWT and attaches req.admin.
 */
module.exports = function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication token required.',
    });
  }

  try {
    const payload = verifyAdminToken(authHeader.split(' ')[1]);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token.',
    });
  }
};
