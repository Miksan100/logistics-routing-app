const { query } = require('../config/database');

async function startDay(driverId, vehicleId, companyId, startOdometer) {
  const today = new Date().toISOString().split('T')[0];
  await query(
    'UPDATE vehicles SET current_odometer = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3',
    [startOdometer, vehicleId, companyId]
  );
  const result = await query(
    `INSERT INTO odometer_logs (company_id, driver_id, vehicle_id, log_date, start_odometer)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (driver_id, vehicle_id, log_date)
     DO UPDATE SET start_odometer = $5, updated_at = NOW()
     RETURNING *`,
    [companyId, driverId, vehicleId, today, startOdometer]
  );
  return result.rows[0];
}

async function endDay(driverId, vehicleId, companyId, endOdometer) {
  const today = new Date().toISOString().split('T')[0];
  const existing = await query(
    'SELECT start_odometer FROM odometer_logs WHERE driver_id = $1 AND vehicle_id = $2 AND log_date = $3',
    [driverId, vehicleId, today]
  );
  if (!existing.rows.length) {
    throw Object.assign(new Error('No start odometer recorded for today'), { status: 400 });
  }
  const startOdometer = parseFloat(existing.rows[0].start_odometer);
  if (endOdometer < startOdometer) {
    throw Object.assign(new Error('End odometer cannot be less than start odometer'), { status: 400 });
  }
  const distanceTravelled = endOdometer - startOdometer;
  const result = await query(
    `UPDATE odometer_logs SET end_odometer = $1, distance_travelled = $2, updated_at = NOW()
     WHERE driver_id = $3 AND vehicle_id = $4 AND log_date = $5 RETURNING *`,
    [endOdometer, distanceTravelled, driverId, vehicleId, today]
  );
  await query('UPDATE vehicles SET current_odometer = $1, updated_at = NOW() WHERE id = $2', [endOdometer, vehicleId]);
  return result.rows[0];
}

async function getLogs(companyId, filters = {}) {
  const conditions = ['ol.company_id = $1'];
  const params = [companyId];
  let p = 2;
  if (filters.driverId) { conditions.push(`ol.driver_id = $${p++}`); params.push(filters.driverId); }
  if (filters.vehicleId) { conditions.push(`ol.vehicle_id = $${p++}`); params.push(filters.vehicleId); }
  if (filters.dateFrom) { conditions.push(`ol.log_date >= $${p++}`); params.push(filters.dateFrom); }
  if (filters.dateTo) { conditions.push(`ol.log_date <= $${p++}`); params.push(filters.dateTo); }
  const result = await query(
    `SELECT ol.*, d.first_name || ' ' || d.last_name AS driver_name, v.registration_number, v.make, v.model
     FROM odometer_logs ol
     LEFT JOIN drivers d ON d.id = ol.driver_id
     LEFT JOIN vehicles v ON v.id = ol.vehicle_id
     WHERE ${conditions.join(' AND ')} ORDER BY ol.log_date DESC`,
    params
  );
  return result.rows;
}

async function getTodayLog(driverId, vehicleId) {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(
    'SELECT * FROM odometer_logs WHERE driver_id = $1 AND vehicle_id = $2 AND log_date = $3',
    [driverId, vehicleId, today]
  );
  return result.rows[0] || null;
}

module.exports = { startDay, endDay, getLogs, getTodayLog };
