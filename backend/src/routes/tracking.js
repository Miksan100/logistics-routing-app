const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/trackingService');

const router = express.Router();

// Public endpoint for GPS tracking providers (secured by API key in production)
router.post('/gps', async (req, res, next) => {
  try {
    const { vehicle_id, latitude, longitude, timestamp } = req.body;
    if (!vehicle_id || latitude === undefined || longitude === undefined || !timestamp) {
      return res.status(400).json({ error: 'vehicle_id, latitude, longitude and timestamp are required' });
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

module.exports = router;
