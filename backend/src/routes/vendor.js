const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateVendor } = require('../middleware/vendorAuth');
const { query } = require('../config/database');
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
    if (!planStatus) return res.status(400).json({ error: 'planStatus required' });
    await vendorService.setCompanyPlan(req.params.id, planId ?? null, planStatus);
    res.json({ message: 'Plan updated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.patch('/companies/:id/billing', authenticateVendor, async (req, res, next) => {
  try {
    const { billingType, billingAmount, planId } = req.body;
    if (!billingType || !['monthly', 'once_off'].includes(billingType)) {
      return res.status(400).json({ error: 'billingType must be monthly or once_off' });
    }
    await vendorService.updateCompanyBilling(req.params.id, billingType, billingAmount ?? null, planId ?? null);
    res.json({ message: 'Billing updated' });
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

router.post('/companies/:id/admins', authenticateVendor, async (req, res, next) => {
  try {
    const { adminFirstName, adminLastName, adminEmail, adminPassword, adminIdNumber } = req.body;
    if (!adminFirstName || !adminLastName || !adminEmail || !adminPassword || !adminIdNumber) {
      return res.status(400).json({ error: 'All admin fields are required' });
    }
    const result = await vendorService.addCompanyAdmin(req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
});

router.patch('/companies/:id/admins/:userId/status', authenticateVendor, async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive (boolean) required' });
    await vendorService.setAdminStatus(req.params.id, req.params.userId, isActive);
    res.json({ message: isActive ? 'Admin activated' : 'Admin terminated' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/companies/:id/impersonate', authenticateVendor, async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await query(
      `SELECT u.id, u.company_id, u.email, u.first_name, u.last_name, u.role,
              c.name AS company_name
       FROM users u JOIN companies c ON c.id = u.company_id
       WHERE u.company_id = $1 AND u.role = 'admin' AND u.is_active = true
         ${userId ? 'AND u.id = $2' : 'ORDER BY u.created_at LIMIT 1'}`,
      userId ? [req.params.id, userId] : [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'No active admin found for this company' });
    }
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        companyId: user.company_id,
        companyName: user.company_name,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'admin',
      },
    });
  } catch (err) { next(err); }
});

router.get('/email-history', authenticateVendor, async (req, res, next) => {
  try {
    const result = await require('../config/database').query(
      `SELECT id, to_email, to_name, subject, company_name, email_type, status, error_message, sent_at
       FROM email_logs ORDER BY sent_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
