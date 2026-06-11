const jwt = require('jsonwebtoken');

const JWT_SECRET       = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN   = process.env.JWT_EXPIRES_IN || '60d';
// Separate secret for admin tokens so a user token can never be used as an admin token
const ADMIN_JWT_SECRET = (process.env.JWT_SECRET || 'change-me-in-production') + '_admin';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function signAdminToken(payload) {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: '8h' });
}

function verifyAdminToken(token) {
  return jwt.verify(token, ADMIN_JWT_SECRET);
}

module.exports = { signToken, verifyToken, signAdminToken, verifyAdminToken };
