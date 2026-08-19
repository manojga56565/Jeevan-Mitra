const jwt = require('jsonwebtoken');

// auth('donor'), auth('hospital'), auth('admin') — or auth() to just
// require any valid token regardless of role.
function auth(requiredRole) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided', code: 'NO_TOKEN' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jeevan-mitra-dev-secret');

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ success: false, message: 'You do not have access to this resource' });
      }

      req.user = decoded; // { id, role, ... }
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid — please log in again', code: 'INVALID_TOKEN' });
    }
  };
}

module.exports = { auth };
