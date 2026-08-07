const jwt = require('jsonwebtoken');

/**
 * Usage: auth('donor'), auth('hospital'), auth('admin'), or auth() for
 * "any valid token, any role".
 */
const auth = (role) => (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (role && decoded.role !== role) {
      return res.status(403).json({ success: false, message: `Access denied. Required role: ${role}` });
    }

    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { auth };
