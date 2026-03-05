const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/odometerService');
const driverSvc = require('../services/driverService');

const router = express.Router();
router.use(authenticate);

// Driver: record start of day odometer
router.post('/start-day', requireRole('driver'), async (req, res, next) => {
  try {
    const { startOdometer } = req.body;
    if (startOdometer === undefined || startOdometer === null) {
      return res.status(400).json({ error: 'Start odometer reading is required' });
    }
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    if (!driver.assigned_vehicle_id) {
      return res.status(400).json({ error: 'No vehicle assigned to this driver' });
    }
    const log = await svc.startDay(driver.id, driver.assigned_vehicle_id, req.user.company_id, parseFloat(startOdometer));
    res.json(log);
  } catch (err) { next(err); }
});

// Driver: record end of day odometer
router.post('/end-day', requireRole('driver'), async (req, res, next) => {
  try {
    const { endOdometer } = req.body;
    if (endOdometer === undefined || endOdometer === null) {
      return res.status(400).json({ error: 'End odometer reading is required' });
    }
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    if (!driver.assigned_vehicle_id) {
      return res.status(400).json({ error: 'No vehicle assigned to this driver' });
    }
    const log = await svc.endDay(driver.id, driver.assigned_vehicle_id, req.user.company_id, parseFloat(endOdometer));
    res.json(log);
  } catch (err) { next(err); }
});

// Driver: get today's odometer log
router.get('/today', requireRole('driver'), async (req, res, next) => {
  try {
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    if (!driver.assigned_vehicle_id) return res.json(null);
    const log = await svc.getTodayLog(driver.id, driver.assigned_vehicle_id);
    res.json(log);
  } catch (err) { next(err); }
});

// Admin: get all odometer logs
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { driverId, vehicleId, dateFrom, dateTo } = req.query;
    const logs = await svc.getLogs(req.user.company_id, { driverId, vehicleId, dateFrom, dateTo });
    res.json(logs);
  } catch (err) { next(err); }
});

module.exports = router;
