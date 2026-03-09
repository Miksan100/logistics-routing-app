const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

async function authenticateVendor(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.VENDOR_JWT_SECRET);
    if (payload.role !== 'vendor') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    const result = await query(
      'SELECT id, email, first_name, last_name, is_active FROM vendor_users WHERE id = $1',
      [payload.vendorUserId]
    );
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Vendor user not found or inactive' });
    }
    req.vendor = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}

module.exports = { authenticateVendor };
