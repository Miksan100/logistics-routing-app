const { query } = require('../config/database');

async function getDashboardStats(companyId, date) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const jobStats = await query(
    `SELECT
       COUNT(*) FILTER (WHERE scheduled_date = $2) AS total_today,
       COUNT(*) FILTER (WHERE scheduled_date = $2 AND status = 'completed') AS completed_today,
       COUNT(*) FILTER (WHERE scheduled_date = $2 AND status = 'in_progress') AS in_progress_today,
       COUNT(*) FILTER (WHERE scheduled_date = $2 AND status = 'cancelled') AS cancelled_today,
       COUNT(*) FILTER (WHERE scheduled_date = $2 AND status = 'pending') AS pending_today,
       COUNT(*) FILTER (WHERE scheduled_date = $2 AND status = 'started') AS started_today
     FROM jobs WHERE company_id = $1`,
    [companyId, targetDate]
  );
  const driverStats = await query(
    `SELECT COUNT(DISTINCT d.id) AS total_drivers,
            COUNT(DISTINCT d.id) FILTER (WHERE j.scheduled_date = $2 AND j.status IN ('started','in_progress')) AS active_drivers
     FROM drivers d LEFT JOIN jobs j ON j.assigned_driver_id = d.id
     WHERE d.company_id = $1 AND d.is_active = true`,
    [companyId, targetDate]
  );
  const vehicleStats = await query(
    `SELECT COUNT(DISTINCT v.id) AS total_vehicles,
            COUNT(DISTINCT j.assigned_vehicle_id) FILTER (WHERE j.scheduled_date = $2 AND j.status IN ('started','in_progress')) AS active_vehicles
     FROM vehicles v LEFT JOIN jobs j ON j.assigned_vehicle_id = v.id
     WHERE v.company_id = $1 AND v.is_active = true`,
    [companyId, targetDate]
  );
  return { date: targetDate, jobs: jobStats.rows[0], drivers: driverStats.rows[0], vehicles: vehicleStats.rows[0] };
}

async function getDriverProductivity(companyId, dateFrom, dateTo) {
  const result = await query(
    `SELECT d.id, d.first_name, d.last_name, d.phone,
            COUNT(j.id) AS total_jobs,
            COUNT(j.id) FILTER (WHERE j.status = 'completed') AS completed,
            COUNT(j.id) FILTER (WHERE j.status = 'cancelled') AS cancelled,
            ROUND(COUNT(j.id) FILTER (WHERE j.status = 'completed')::numeric / NULLIF(COUNT(j.id), 0) * 100, 1) AS completion_rate
     FROM drivers d LEFT JOIN jobs j ON j.assigned_driver_id = d.id AND j.scheduled_date BETWEEN $2 AND $3
     WHERE d.company_id = $1 AND d.is_active = true
     GROUP BY d.id, d.first_name, d.last_name, d.phone
     ORDER BY completed DESC`,
    [companyId, dateFrom, dateTo]
  );
  return result.rows;
}

async function getFleetUsage(companyId, dateFrom, dateTo) {
  const result = await query(
    `SELECT v.id, v.registration_number, v.make, v.model,
            COUNT(j.id) AS total_jobs,
            COUNT(j.id) FILTER (WHERE j.status = 'completed') AS completed_jobs,
            COALESCE(SUM(ol.distance_travelled), 0) AS total_distance_km
     FROM vehicles v
     LEFT JOIN jobs j ON j.assigned_vehicle_id = v.id AND j.scheduled_date BETWEEN $2 AND $3
     LEFT JOIN odometer_logs ol ON ol.vehicle_id = v.id AND ol.log_date BETWEEN $2 AND $3
     WHERE v.company_id = $1 AND v.is_active = true
     GROUP BY v.id, v.registration_number, v.make, v.model
     ORDER BY total_distance_km DESC`,
    [companyId, dateFrom, dateTo]
  );
  return result.rows;
}

async function getJobAnalytics(companyId, dateFrom, dateTo) {
  const result = await query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*),0) * 100, 1) AS completion_rate,
            ROUND(COUNT(*) FILTER (WHERE status = 'cancelled')::numeric / NULLIF(COUNT(*),0) * 100, 1) AS cancellation_rate
     FROM jobs WHERE company_id = $1 AND scheduled_date BETWEEN $2 AND $3`,
    [companyId, dateFrom, dateTo]
  );
  return result.rows[0];
}

module.exports = { getDashboardStats, getDriverProductivity, getFleetUsage, getJobAnalytics };
