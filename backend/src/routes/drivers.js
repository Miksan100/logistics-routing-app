const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/driverService');

const router = express.Router();
router.use(authenticate);

// Admin: list all drivers
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const drivers = await svc.listDrivers(req.user.company_id);
    res.json(drivers);
  } catch (err) { next(err); }
});

// Driver: get own profile
router.get('/me', requireRole('driver'), async (req, res, next) => {
  try {
    const driver = await svc.getDriverByUserId(req.user.id);
    res.json(driver);
  } catch (err) { next(err); }
});

// Admin: get single driver
router.get('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const driver = await svc.getDriver(req.params.id, req.user.company_id);
    res.json(driver);
  } catch (err) { next(err); }
});

// Admin: create driver
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, licenseNumber, licenseExpiry } = req.body;
    if (!firstName || !lastName || !phone || !email || !licenseNumber || !licenseExpiry) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    const driver = await svc.createDriver(req.user.company_id, req.body);
    res.status(201).json(driver);
  } catch (err) { next(err); }
});

// Admin: update driver
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const driver = await svc.updateDriver(req.params.id, req.user.company_id, req.body);
    res.json(driver);
  } catch (err) { next(err); }
});

// Admin: delete (deactivate) driver
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await svc.deleteDriver(req.params.id, req.user.company_id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
