const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
async function login(email, password) {
  const result = await query(
    `SELECT u.id, u.company_id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active,
            c.name AS company_name
     FROM users u JOIN companies c ON c.id = u.company_id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  if (!result.rows.length) {
    // Fall through to vendor_users
    const vResult = await query(
      'SELECT id, email, password_hash, first_name, last_name, is_active FROM vendor_users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!vResult.rows.length) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
    const vendor = vResult.rows[0];
    if (!vendor.is_active) throw Object.assign(new Error('Account is disabled'), { status: 403 });
    const valid = await bcrypt.compare(password, vendor.password_hash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    await query('UPDATE vendor_users SET last_login = NOW() WHERE id = $1', [vendor.id]);
    const token = jwt.sign(
      { vendorUserId: vendor.id, role: 'vendor' },
      process.env.VENDOR_JWT_SECRET,
      { expiresIn: process.env.VENDOR_JWT_EXPIRES_IN || '8h' }
    );
    return {
      token,
      user: {
        id: vendor.id,
        email: vendor.email,
        firstName: vendor.first_name,
        lastName: vendor.last_name,
        role: 'vendor',
      },
    };
  }
  const user = result.rows[0];
  if (!user.is_active) {
    throw Object.assign(new Error('Account is disabled'), { status: 403 });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  // If driver role, fetch driver profile
  let driverProfile = null;
  if (user.role === 'driver') {
    const dr = await query(
      'SELECT id, assigned_vehicle_id FROM drivers WHERE user_id = $1',
      [user.id]
    );
    if (dr.rows.length) driverProfile = dr.rows[0];
  }
  const token = jwt.sign(
    { userId: user.id, companyId: user.company_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  return {
    token,
    user: {
      id: user.id,
      companyId: user.company_id,
      companyName: user.company_name,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      driverProfile,
    },
  };
}
async function changePassword(userId, currentPassword, newPassword) {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!result.rows.length) throw Object.assign(new Error('User not found'), { status: 404 });
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) throw Object.assign(new Error('Current password is incorrect'), { status: 400 });
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
}
module.exports = { login, changePassword };
