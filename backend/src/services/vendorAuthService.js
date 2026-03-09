const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

async function loginVendor(email, password) {
  const result = await query(
    'SELECT id, email, password_hash, first_name, last_name, is_active FROM vendor_users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  if (!result.rows.length) throw { status: 401, message: 'Invalid credentials' };
  const vendor = result.rows[0];
  if (!vendor.is_active) throw { status: 403, message: 'Account disabled' };
  const valid = await bcrypt.compare(password, vendor.password_hash);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };
  await query('UPDATE vendor_users SET last_login = NOW() WHERE id = $1', [vendor.id]);
  const token = jwt.sign(
    { vendorUserId: vendor.id, role: 'vendor' },
    process.env.VENDOR_JWT_SECRET,
    { expiresIn: process.env.VENDOR_JWT_EXPIRES_IN || '8h' }
  );
  return {
    token,
    vendor: {
      id: vendor.id,
      email: vendor.email,
      firstName: vendor.first_name,
      lastName: vendor.last_name,
    },
  };
}

async function changeVendorPassword(vendorUserId, currentPwd, newPwd) {
  const result = await query('SELECT password_hash FROM vendor_users WHERE id = $1', [vendorUserId]);
  if (!result.rows.length) throw { status: 404, message: 'Not found' };
  const valid = await bcrypt.compare(currentPwd, result.rows[0].password_hash);
  if (!valid) throw { status: 400, message: 'Current password is incorrect' };
  const hash = await bcrypt.hash(newPwd, 12);
  await query('UPDATE vendor_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, vendorUserId]);
}

async function getVendorById(vendorUserId) {
  const result = await query(
    'SELECT id, email, first_name, last_name, last_login, created_at FROM vendor_users WHERE id = $1',
    [vendorUserId]
  );
  if (!result.rows.length) throw { status: 404, message: 'Not found' };
  const v = result.rows[0];
  return { id: v.id, email: v.email, firstName: v.first_name, lastName: v.last_name, lastLogin: v.last_login, createdAt: v.created_at };
}

module.exports = { loginVendor, changeVendorPassword, getVendorById };
