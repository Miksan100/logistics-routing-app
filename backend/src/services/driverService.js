const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
async function listDrivers(companyId) {
  const result = await query(
    `SELECT d.*, v.registration_number, v.make, v.model,
            u.email as user_email, u.is_active as user_active
     FROM drivers d
     LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.company_id = $1
     ORDER BY d.last_name, d.first_name`,
    [companyId]
  );
  return result.rows;
}
async function getDriver(id, companyId) {
  const result = await query(
    `SELECT d.*, v.registration_number, v.make, v.model
     FROM drivers d
     LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
     WHERE d.id = $1 AND d.company_id = $2`,
    [id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Driver not found'), { status: 404 });
  return result.rows[0];
}
async function createDriver(companyId, data) {
  const { firstName, lastName, phone, email, licenseNumber, licenseExpiry, assignedVehicleId, password } = data;
  const passwordHash = await bcrypt.hash(password || 'Driver1234!', 12);
  const userResult = await query(
    `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, 'driver') RETURNING id`,
    [companyId, email.toLowerCase(), passwordHash, firstName, lastName]
  );
  const userId = userResult.rows[0].id;
  const driverResult = await query(
    `INSERT INTO drivers (company_id, user_id, first_name, last_name, phone, email, license_number, license_expiry, assigned_vehicle_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [companyId, userId, firstName, lastName, phone, email.toLowerCase(), licenseNumber, licenseExpiry, assignedVehicleId || null]
  );
  return driverResult.rows[0];
}
async function updateDriver(id, companyId, data) {
  const { firstName, lastName, phone, email, licenseNumber, licenseExpiry, assignedVehicleId, isActive, password } = data;
  const result = await query(
    `UPDATE drivers SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       phone = COALESCE($3, phone),
       email = COALESCE($4, email),
       license_number = COALESCE($5, license_number),
       license_expiry = COALESCE($6, license_expiry),
       assigned_vehicle_id = $7,
       is_active = COALESCE($8, is_active),
       updated_at = NOW()
     WHERE id = $9 AND company_id = $10 RETURNING *`,
    [firstName, lastName, phone, email, licenseNumber, licenseExpiry, assignedVehicleId || null, isActive, id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Driver not found'), { status: 404 });
  const dr = result.rows[0];
  // Sync user account
  const userUpdates = { email, firstName, lastName, isActive };
  if (password && password.trim()) {
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET email = COALESCE($1, email), first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name), is_active = COALESCE($4, is_active),
         password_hash = $5, updated_at = NOW() WHERE id = $6`,
      [email, firstName, lastName, isActive, passwordHash, dr.user_id]
    );
  } else {
    await query(
      `UPDATE users SET email = COALESCE($1, email), first_name = COALESCE($2, first_name),
         last_name = COALESCE($3, last_name), is_active = COALESCE($4, is_active),
         updated_at = NOW() WHERE id = $5`,
      [email, firstName, lastName, isActive, dr.user_id]
    );
  }
  return dr;
}
async function deleteDriver(id, companyId) {
  const result = await query(
    'UPDATE drivers SET is_active = false, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id, user_id',
    [id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Driver not found'), { status: 404 });
  if (result.rows[0].user_id) {
    await query('UPDATE users SET is_active = false WHERE id = $1', [result.rows[0].user_id]);
  }
}
async function getDriverByUserId(userId) {
  const result = await query(
    `SELECT d.*, v.registration_number, v.make, v.model, v.current_odometer
     FROM drivers d LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
     WHERE d.user_id = $1`,
    [userId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Driver profile not found'), { status: 404 });
  return result.rows[0];
}
module.exports = { listDrivers, getDriver, createDriver, updateDriver, deleteDriver, getDriverByUserId };
