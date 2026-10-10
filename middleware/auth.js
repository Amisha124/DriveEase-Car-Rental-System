const jwt = require('jsonwebtoken');
const db = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET || 'driveease_super_secret_jwt_key_2026';

// Middleware to authenticate JWT token
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findOne('users', { id: decoded.id });
    if (!user) {
      return res.status(401).json({ error: 'User not found or account disabled' });
    }
    if (user.status === 'Disabled') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// Optional authentication: attaches user if token is provided, does not fail if guest
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.findOne('users', { id: decoded.id });
      if (user && user.status !== 'Disabled') {
        req.user = user;
      }
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

// Role authorization
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticate,
  optionalAuth,
  requireRole
};
