const { query } = require('../config/database');

async function listJobs(companyId, filters = {}) {
  const conditions = ['j.company_id = $1'];
  const params = [companyId];
  let p = 2;
  if (filters.date) { conditions.push(`j.scheduled_date = $${p++}`); params.push(filters.date); }
  if (filters.status) { conditions.push(`j.status = $${p++}`); params.push(filters.status); }
  if (filters.driverId) { conditions.push(`j.assigned_driver_id = $${p++}`); params.push(filters.driverId); }

  const result = await query(
    `SELECT j.*,
            d.first_name || ' ' || d.last_name AS driver_name,
            d.phone AS driver_phone,
            v.registration_number, v.make, v.model
     FROM jobs j
     LEFT JOIN drivers d ON d.id = j.assigned_driver_id
     LEFT JOIN vehicles v ON v.id = j.assigned_vehicle_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY j.scheduled_date DESC, j.created_at DESC`,
    params
  );
  return result.rows;
}

async function getJob(id, companyId) {
  const result = await query(
    `SELECT j.*,
            d.first_name || ' ' || d.last_name AS driver_name,
            d.phone AS driver_phone,
            v.registration_number, v.make, v.model
     FROM jobs j
     LEFT JOIN drivers d ON d.id = j.assigned_driver_id
     LEFT JOIN vehicles v ON v.id = j.assigned_vehicle_id
     WHERE j.id = $1 AND j.company_id = $2`,
    [id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Job not found'), { status: 404 });
  const statusHistory = await query(
    'SELECT * FROM job_status_updates WHERE job_id = $1 ORDER BY created_at ASC',
    [id]
  );
  return { ...result.rows[0], statusHistory: statusHistory.rows };
}

async function createJob(companyId, createdBy, data) {
  const {
    title, description, pickupAddress, pickupLat, pickupLng,
    deliveryAddress, deliveryLat, deliveryLng, scheduledDate,
    estimatedDurationMinutes, plannedRouteDistanceKm,
    assignedDriverId, assignedVehicleId,
  } = data;

  const result = await query(
    `INSERT INTO jobs (
       company_id, title, description,
       pickup_address, pickup_lat, pickup_lng,
       delivery_address, delivery_lat, delivery_lng,
       scheduled_date, estimated_duration_minutes, planned_route_distance_km,
       assigned_driver_id, assigned_vehicle_id, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [companyId, title, description || null,
     pickupAddress, pickupLat || null, pickupLng || null,
     deliveryAddress, deliveryLat || null, deliveryLng || null,
     scheduledDate, estimatedDurationMinutes || null, plannedRouteDistanceKm || null,
     assignedDriverId || null, assignedVehicleId || null, createdBy]
  );
  return result.rows[0];
}

async function updateJob(id, companyId, data) {
  const {
    title, description, pickupAddress, pickupLat, pickupLng,
    deliveryAddress, deliveryLat, deliveryLng, scheduledDate,
    estimatedDurationMinutes, plannedRouteDistanceKm,
    assignedDriverId, assignedVehicleId,
  } = data;
  const result = await query(
    `UPDATE jobs SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       pickup_address = COALESCE($3, pickup_address),
       pickup_lat = COALESCE($4, pickup_lat),
       pickup_lng = COALESCE($5, pickup_lng),
       delivery_address = COALESCE($6, delivery_address),
       delivery_lat = COALESCE($7, delivery_lat),
       delivery_lng = COALESCE($8, delivery_lng),
       scheduled_date = COALESCE($9, scheduled_date),
       estimated_duration_minutes = COALESCE($10, estimated_duration_minutes),
       planned_route_distance_km = COALESCE($11, planned_route_distance_km),
       assigned_driver_id = COALESCE($12, assigned_driver_id),
       assigned_vehicle_id = COALESCE($13, assigned_vehicle_id),
       updated_at = NOW()
     WHERE id = $14 AND company_id = $15
     RETURNING *`,
    [title, description, pickupAddress, pickupLat, pickupLng,
     deliveryAddress, deliveryLat, deliveryLng, scheduledDate,
     estimatedDurationMinutes, plannedRouteDistanceKm,
     assignedDriverId, assignedVehicleId, id, companyId]
  );
  if (!result.rows.length) throw Object.assign(new Error('Job not found'), { status: 404 });
  return result.rows[0];
}

const ALLOWED_TRANSITIONS = {
  pending:     ['started', 'cancelled'],
  started:     ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

async function updateJobStatus(jobId, companyId, driverId, newStatus, note) {
  const jobResult = await query(
    'SELECT status FROM jobs WHERE id = $1 AND company_id = $2',
    [jobId, companyId]
  );
  if (!jobResult.rows.length) throw Object.assign(new Error('Job not found'), { status: 404 });

  const previousStatus = jobResult.rows[0].status;
  if (!ALLOWED_TRANSITIONS[previousStatus].includes(newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from '${previousStatus}' to '${newStatus}'`),
      { status: 400 }
    );
  }

  const timestampUpdates = { started: 'started_at = NOW()', completed: 'completed_at = NOW()', cancelled: 'cancelled_at = NOW()' };
  const extra = timestampUpdates[newStatus] ? `, ${timestampUpdates[newStatus]}` : '';
  const cancelExtra = newStatus === 'cancelled' && note ? ', cancellation_reason = $3' : '';
  const cancelParams = newStatus === 'cancelled' && note ? [note] : [];

  const result = await query(
    `UPDATE jobs SET status = $1, updated_at = NOW()${extra}${cancelExtra} WHERE id = $2 AND company_id = $${3 + cancelParams.length} RETURNING *`,
    [newStatus, jobId, ...cancelParams, companyId]
  );

  await query(
    'INSERT INTO job_status_updates (job_id, driver_id, previous_status, new_status, note) VALUES ($1,$2,$3,$4,$5)',
    [jobId, driverId || null, previousStatus, newStatus, note || null]
  );

  return result.rows[0];
}

async function getTodayJobsForDriver(driverId, companyId) {
  const result = await query(
    `SELECT j.*, v.registration_number, v.make, v.model
     FROM jobs j
     LEFT JOIN vehicles v ON v.id = j.assigned_vehicle_id
     WHERE j.assigned_driver_id = $1 AND j.company_id = $2 AND j.status NOT IN ('completed', 'cancelled')
     ORDER BY j.created_at ASC`,
    [driverId, companyId]
  );
  return result.rows;
}

module.exports = { listJobs, getJob, createJob, updateJob, updateJobStatus, getTodayJobsForDriver };
