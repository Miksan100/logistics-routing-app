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


async function recordJobGPS(companyId, jobId, driverId, latitude, longitude, accuracy) {
  await query(
    `INSERT INTO job_gps_tracks (company_id, job_id, driver_id, latitude, longitude, accuracy)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [companyId, jobId, driverId, latitude, longitude, accuracy || null]
  );
}

async function getJobRoute(jobId, companyId) {
  const result = await query(
    `SELECT latitude, longitude, accuracy, timestamp
     FROM job_gps_tracks
     WHERE job_id = $1 AND company_id = $2
     ORDER BY timestamp ASC`,
    [jobId, companyId]
  );
  return result.rows;
}

async function getJobsWithRoutes(companyId) {
  const result = await query(
    `SELECT j.id, j.title, j.pickup_address, j.delivery_address, j.scheduled_date,
            j.status, j.started_at, j.completed_at,
            d.first_name || ' ' || d.last_name AS driver_name,
            v.registration_number, v.make, v.model,
            COUNT(t.id) AS gps_point_count
     FROM jobs j
     LEFT JOIN drivers d ON d.id = j.assigned_driver_id
     LEFT JOIN vehicles v ON v.id = j.assigned_vehicle_id
     LEFT JOIN job_gps_tracks t ON t.job_id = j.id
     WHERE j.company_id = $1 AND j.status IN ('completed', 'cancelled', 'in_progress', 'started')
     GROUP BY j.id, d.first_name, d.last_name, v.registration_number, v.make, v.model
     ORDER BY j.scheduled_date DESC, j.created_at DESC`,
    [companyId]
  );
  return result.rows;
}

module.exports = { recordGPS, getLatestPositions, getVehicleHistory, recordJobGPS, getJobRoute, getJobsWithRoutes };
