const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
async function login(email, password) {
  const result = await query(
    'SELECT id, company_id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (!result.rows.length) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
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
