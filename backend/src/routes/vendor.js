const express = require('express');
const router = express.Router();
const { authenticateVendor } = require('../middleware/vendorAuth');
const vendorAuthService = require('../services/vendorAuthService');
const vendorService = require('../services/vendorService');

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await vendorAuthService.loginVendor(email, password);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/auth/me', authenticateVendor, async (req, res, next) => {
  try {
    const vendor = await vendorAuthService.getVendorById(req.vendor.id);
    res.json(vendor);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/auth/change-password', authenticateVendor, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    await vendorAuthService.changeVendorPassword(req.vendor.id, currentPassword, newPassword);
    res.json({ message: 'Password updated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', authenticateVendor, async (req, res, next) => {
  try {
    const stats = await vendorService.getPlatformStats();
    res.json(stats);
  } catch (err) { next(err); }
});

// ── Plans ─────────────────────────────────────────────────────────────────────

router.get('/plans', authenticateVendor, async (req, res, next) => {
  try {
    const plans = await vendorService.listPlans();
    res.json(plans);
  } catch (err) { next(err); }
});

// ── Companies ─────────────────────────────────────────────────────────────────

router.get('/companies', authenticateVendor, async (req, res, next) => {
  try {
    const companies = await vendorService.listCompanies({
      search: req.query.search,
      status: req.query.status,
    });
    res.json(companies);
  } catch (err) { next(err); }
});

router.post('/companies', authenticateVendor, async (req, res, next) => {
  try {
    const { companyName, adminFirstName, adminLastName, adminEmail, adminPassword, billingEmail, planId, adminIdNumber } = req.body;
    if (!companyName || !adminFirstName || !adminLastName || !adminEmail || !adminPassword || !adminIdNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await vendorService.createCompany(req.body);
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

router.get('/companies/:id', authenticateVendor, async (req, res, next) => {
  try {
    const detail = await vendorService.getCompanyDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.patch('/companies/:id/status', authenticateVendor, async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be boolean' });
    await vendorService.setCompanyStatus(req.params.id, isActive);
    res.json({ message: 'Status updated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.patch('/companies/:id/plan', authenticateVendor, async (req, res, next) => {
  try {
    const { planId, planStatus } = req.body;
    if (!planId || !planStatus) return res.status(400).json({ error: 'planId and planStatus required' });
    await vendorService.setCompanyPlan(req.params.id, planId, planStatus);
    res.json({ message: 'Plan updated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.patch('/companies/:id/notes', authenticateVendor, async (req, res, next) => {
  try {
    const { notes } = req.body;
    await vendorService.updateCompanyNotes(req.params.id, notes || null);
    res.json({ message: 'Notes updated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
