const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const svc = require('../services/jobService');
const driverSvc = require('../services/driverService');

const router = express.Router();
router.use(authenticate);

// Admin: list jobs with filters
router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { date, status, driverId } = req.query;
    const jobs = await svc.listJobs(req.user.company_id, { date, status, driverId });
    res.json(jobs);
  } catch (err) { next(err); }
});

// Driver: today's jobs
router.get('/my-jobs', requireRole('driver'), async (req, res, next) => {
  try {
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    const jobs = await svc.getTodayJobsForDriver(driver.id, req.user.company_id);
    res.json(jobs);
  } catch (err) { next(err); }
});

// Get single job (admin or assigned driver)
router.get('/:id', async (req, res, next) => {
  try {
    const job = await svc.getJob(req.params.id, req.user.company_id);
    if (req.user.role === 'driver') {
      const driver = await driverSvc.getDriverByUserId(req.user.id);
      if (job.assigned_driver_id !== driver.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    res.json(job);
  } catch (err) { next(err); }
});

// Admin: create job
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { title, pickupAddress, deliveryAddress, scheduledDate } = req.body;
    if (!title || !pickupAddress || !deliveryAddress || !scheduledDate) {
      return res.status(400).json({ error: 'Title, pickup address, delivery address and scheduled date are required' });
    }
    const job = await svc.createJob(req.user.company_id, req.user.id, req.body);
    res.status(201).json(job);
  } catch (err) { next(err); }
});

// Admin: update job details
router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const job = await svc.updateJob(req.params.id, req.user.company_id, req.body);
    res.json(job);
  } catch (err) { next(err); }
});

// Driver: save route data (polyline + distance + duration from Google Directions API)
router.patch('/:id/route', requireRole('driver'), async (req, res, next) => {
  try {
    const { polyline, distanceKm, durationMinutes } = req.body;
    if (!polyline) return res.status(400).json({ error: 'polyline is required' });
    await svc.saveRouteData(req.params.id, req.user.company_id, polyline, distanceKm, durationMinutes);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Driver: start job
router.post('/:id/start', requireRole('driver'), async (req, res, next) => {
  try {
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    const job = await svc.updateJobStatus(req.params.id, req.user.company_id, driver.id, 'started', req.body.note);
    res.json(job);
  } catch (err) { next(err); }
});

// Driver: mark in progress
router.post('/:id/progress', requireRole('driver'), async (req, res, next) => {
  try {
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    const job = await svc.updateJobStatus(req.params.id, req.user.company_id, driver.id, 'in_progress', req.body.note);
    res.json(job);
  } catch (err) { next(err); }
});

// Driver: complete job
router.post('/:id/complete', requireRole('driver'), async (req, res, next) => {
  try {
    const driver = await driverSvc.getDriverByUserId(req.user.id);
    const job = await svc.updateJobStatus(req.params.id, req.user.company_id, driver.id, 'completed', req.body.note);
    res.json(job);
  } catch (err) { next(err); }
});

// Driver or Admin: cancel job
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }
    let driverId = null;
    if (req.user.role === 'driver') {
      const driver = await driverSvc.getDriverByUserId(req.user.id);
      driverId = driver.id;
    }
    const job = await svc.updateJobStatus(req.params.id, req.user.company_id, driverId, 'cancelled', reason);
    res.json(job);
  } catch (err) { next(err); }
});

module.exports = router;
