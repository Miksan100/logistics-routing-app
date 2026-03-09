const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      `SELECT u.id, u.company_id, u.email, u.first_name, u.last_name, u.role, u.is_active,
              c.is_active AS company_active
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [payload.userId]
    );
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    if (!result.rows[0].company_active) {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}
module.exports = { authenticate, requireRole };
