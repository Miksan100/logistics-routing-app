const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/analyticsService');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const { date } = req.query;
    const stats = await svc.getDashboardStats(req.user.company_id, date);
    res.json(stats);
  } catch (err) { next(err); }
});

router.get('/driver-productivity', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = req.query.dateFrom || today;
    const dateTo = req.query.dateTo || today;
    const data = await svc.getDriverProductivity(req.user.company_id, dateFrom, dateTo);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/fleet-usage', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = req.query.dateFrom || today;
    const dateTo = req.query.dateTo || today;
    const data = await svc.getFleetUsage(req.user.company_id, dateFrom, dateTo);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/jobs', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = req.query.dateFrom || today;
    const dateTo = req.query.dateTo || today;
    const data = await svc.getJobAnalytics(req.user.company_id, dateFrom, dateTo);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
