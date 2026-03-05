const { query } = require('../config/database');

async function recordGPS(payload) {
  const { vehicle_id, latitude, longitude, speed, timestamp, provider } = payload;
  const vehicleResult = await query(
    'SELECT id, company_id FROM vehicles WHERE tracking_device_id = $1 LIMIT 1',
    [vehicle_id]
  );
  const companyId = vehicleResult.rows.length ? vehicleResult.rows[0].company_id : null;
  const result = await query(
    `INSERT INTO gps_tracking (company_id, vehicle_id, latitude, longitude, speed, timestamp, provider, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [companyId, vehicle_id, latitude, longitude, speed || null, timestamp, provider || null, JSON.stringify(payload)]
  );
  return result.rows[0];
}

async function getLatestPositions(companyId) {
  const result = await query(
    `SELECT DISTINCT ON (g.vehicle_id)
            g.vehicle_id, g.latitude, g.longitude, g.speed, g.timestamp, g.provider,
            v.registration_number, v.make, v.model
     FROM gps_tracking g
     LEFT JOIN vehicles v ON v.tracking_device_id = g.vehicle_id AND v.company_id = $1
     WHERE g.company_id = $1
     ORDER BY g.vehicle_id, g.timestamp DESC`,
    [companyId]
  );
  return result.rows;
}

async function getVehicleHistory(vehicleId, companyId, from, to) {
  const conditions = ['g.vehicle_id = $1', 'g.company_id = $2'];
  const params = [vehicleId, companyId];
  let p = 3;
  if (from) { conditions.push(`g.timestamp >= $${p++}`); params.push(from); }
  if (to) { conditions.push(`g.timestamp <= $${p++}`); params.push(to); }
  const result = await query(
    `SELECT * FROM gps_tracking g WHERE ${conditions.join(' AND ')} ORDER BY g.timestamp ASC`,
    params
  );
  return result.rows;
}

module.exports = { recordGPS, getLatestPositions, getVehicleHistory };
