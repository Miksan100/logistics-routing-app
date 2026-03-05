const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/vehicleService');

const router = express.Router();
router.use(authenticate);

router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await svc.listVehicles(req.user.company_id));
  } catch (err) { next(err); }
});

router.get('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await svc.getVehicle(req.params.id, req.user.company_id));
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { registrationNumber, make, model, year, fuelType } = req.body;
    if (!registrationNumber || !make || !model || !year || !fuelType) {
      return res.status(400).json({ error: 'Registration number, make, model, year and fuel type are required' });
    }
    const vehicle = await svc.createVehicle(req.user.company_id, req.body);
    res.status(201).json(vehicle);
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await svc.updateVehicle(req.params.id, req.user.company_id, req.body));
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await svc.deleteVehicle(req.params.id, req.user.company_id);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
