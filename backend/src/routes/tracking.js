const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/trackingService');
const driverSvc = require('../services/driverService');

const router = express.Router();

// Public endpoint for GPS tracking providers (secured by API key in production)
router.post('/gps', async (req, res, next) => {
  try {
    const { vehicle_id, latitude, longitude, timestamp } = req.body;
    if (!vehicle_id || latitude === undefined || longitude === undefined || !timestamp) {
      return res.status(400).json({ error: 'vehicle_id, latitude, longitude and timestamp are required' });
    }
    const lat = parseFloat(latitude), lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }
    const record = await svc.recordGPS(req.body);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// Admin: get latest positions for all fleet vehicles
router.get('/positions', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const positions = await svc.getLatestPositions(req.user.company_id);
    res.json(positions);
  } catch (err) { next(err); }
});

// Admin: get GPS history for a vehicle
router.get('/history/:vehicleId', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const history = await svc.getVehicleHistory(req.params.vehicleId, req.user.company_id, from, to);
    res.json(history);
  } catch (err) { next(err); }
});


// Driver: record a GPS point for a specific job
router.post('/job/:jobId/track', authenticate, requireRole('driver'), async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const lat = parseFloat(latitude), lng = parseFloat(longitude);
    if (latitude === undefined || longitude === undefined || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude range' });
    }
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    await svc.recordJobGPS(req.user.company_id, req.params.jobId, driver.id, latitude, longitude, accuracy);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// Admin: get GPS route for a specific job
router.get('/job/:jobId/route', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const route = await svc.getJobRoute(req.params.jobId, req.user.company_id);
    res.json(route);
  } catch (err) { next(err); }
});

// Admin: list all jobs that have tracking data (job history)
router.get('/jobs', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const jobs = await svc.getJobsWithRoutes(req.user.company_id);
    res.json(jobs);
  } catch (err) { next(err); }
});

module.exports = router;
