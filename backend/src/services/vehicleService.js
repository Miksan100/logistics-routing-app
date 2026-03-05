const { query } = require('../config/database');

async function listVehicles(companyId) {
  const result = await query(
    `SELECT v.*,
            d.first_name || ' ' || d.last_name AS assigned_driver_name
     FROM vehicles v
     LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id AND d.is_active = true
     WHERE v.company_id = $1
     ORDER BY v.make, v.model`,
    [companyId]
  );
  return result.rows;
}

async function getVehicle(id, companyId) {
  const result = await query(
    `SELECT v.*, d.first_name || ' ' || d.last_name AS assigned_driver_name
     FROM vehicles v
     LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id AND d.is_active = true
     WHERE v.id = $1 AND v.company_id = $2`,
    [id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
  return result.rows[0];
}

async function createVehicle(companyId, data) {
  const { registrationNumber, make, model, year, fuelType, serviceIntervalKm, currentOdometer, trackingDeviceId } = data;
  const result = await query(
    `INSERT INTO vehicles (company_id, registration_number, make, model, year, fuel_type, service_interval_km, current_odometer, tracking_device_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [companyId, registrationNumber, make, model, year, fuelType, serviceIntervalKm || 10000, currentOdometer || 0, trackingDeviceId || null]
  );
  return result.rows[0];
}

async function updateVehicle(id, companyId, data) {
  const { registrationNumber, make, model, year, fuelType, serviceIntervalKm, currentOdometer, trackingDeviceId, isActive } = data;
  const result = await query(
    `UPDATE vehicles SET
       registration_number = COALESCE($1, registration_number),
       make = COALESCE($2, make),
       model = COALESCE($3, model),
       year = COALESCE($4, year),
       fuel_type = COALESCE($5, fuel_type),
       service_interval_km = COALESCE($6, service_interval_km),
       current_odometer = COALESCE($7, current_odometer),
       tracking_device_id = COALESCE($8, tracking_device_id),
       is_active = COALESCE($9, is_active),
       updated_at = NOW()
     WHERE id = $10 AND company_id = $11
     RETURNING *`,
    [registrationNumber, make, model, year, fuelType, serviceIntervalKm, currentOdometer, trackingDeviceId, isActive, id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
  return result.rows[0];
}

async function deleteVehicle(id, companyId) {
  const result = await query(
    'UPDATE vehicles SET is_active = false, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Vehicle not found'), { status: 404 });
}

module.exports = { listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle };
