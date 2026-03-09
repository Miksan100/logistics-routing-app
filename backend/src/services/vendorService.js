const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/database');

async function listCompanies(filters = {}) {
  const conditions = [];
  const params = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(c.name ILIKE $${params.length} OR c.billing_email ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`c.plan_status = $${params.length}`);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const result = await query(
    `SELECT c.id, c.name, c.is_active, c.plan_status, c.trial_ends_at, c.billing_email, c.created_at,
            p.name AS plan_name, p.price_monthly,
            COUNT(DISTINCT d.id) AS driver_count,
            COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'admin') AS admin_count,
            COUNT(DISTINCT j.id) AS job_count
     FROM companies c
     LEFT JOIN plans p ON p.id = c.plan_id
     LEFT JOIN drivers d ON d.company_id = c.id
     LEFT JOIN users u ON u.company_id = c.id
     LEFT JOIN jobs j ON j.company_id = c.id
     ${where}
     GROUP BY c.id, p.name, p.price_monthly
     ORDER BY c.created_at DESC`,
    params
  );
  return result.rows;
}

async function getCompanyDetail(companyId) {
  const [companyRes, usersRes, statsRes] = await Promise.all([
    query(
      `SELECT c.*, p.name AS plan_name, p.price_monthly
       FROM companies c LEFT JOIN plans p ON p.id = c.plan_id
       WHERE c.id = $1`,
      [companyId]
    ),
    query(
      `SELECT id, email, first_name, last_name, role, is_active, last_login, created_at
       FROM users WHERE company_id = $1 ORDER BY role, first_name`,
      [companyId]
    ),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE TRUE) AS total_jobs,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS jobs_this_month,
         COUNT(DISTINCT driver_id) AS active_drivers,
         MAX(updated_at) AS last_activity
       FROM jobs WHERE company_id = $1`,
      [companyId]
    ),
  ]);
  if (!companyRes.rows.length) throw { status: 404, message: 'Company not found' };
  return {
    company: companyRes.rows[0],
    users: usersRes.rows,
    stats: statsRes.rows[0],
  };
}

async function createCompany(data) {
  const { companyName, adminFirstName, adminLastName, adminEmail, adminPassword, billingEmail, planId } = data;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const companyId = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, billing_email, plan_id, plan_status, is_active)
       VALUES ($1, $2, $3, $4, 'trial', true)`,
      [companyId, companyName, billingEmail || adminEmail, planId || null]
    );
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, plain_password, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', true)`,
      [userId, companyId, adminEmail.toLowerCase().trim(), passwordHash, adminPassword, adminFirstName, adminLastName]
    );
    await client.query('COMMIT');
    return { companyId, userId, companyName, adminEmail, adminPassword };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function setCompanyStatus(companyId, isActive) {
  const result = await query(
    'UPDATE companies SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
    [isActive, companyId]
  );
  if (!result.rows.length) throw { status: 404, message: 'Company not found' };
}

async function setCompanyPlan(companyId, planId, planStatus) {
  const result = await query(
    'UPDATE companies SET plan_id = $1, plan_status = $2, updated_at = NOW() WHERE id = $3 RETURNING id',
    [planId, planStatus, companyId]
  );
  if (!result.rows.length) throw { status: 404, message: 'Company not found' };
}

async function updateCompanyNotes(companyId, notes) {
  const result = await query(
    'UPDATE companies SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
    [notes, companyId]
  );
  if (!result.rows.length) throw { status: 404, message: 'Company not found' };
}

async function getPlatformStats() {
  const result = await query(
    `SELECT
       COUNT(*) AS total_companies,
       COUNT(*) FILTER (WHERE is_active = true AND plan_status = 'active') AS active_companies,
       COUNT(*) FILTER (WHERE plan_status = 'trial') AS trial_companies,
       COUNT(*) FILTER (WHERE plan_status = 'suspended' OR is_active = false) AS suspended_companies
     FROM companies`
  );
  const driverRes = await query('SELECT COUNT(*) AS total_drivers FROM drivers');
  const jobRes = await query(
    `SELECT COUNT(*) AS jobs_this_month FROM jobs
     WHERE created_at >= date_trunc('month', NOW())`
  );
  const mrrRes = await query(
    `SELECT COALESCE(SUM(p.price_monthly), 0) AS mrr
     FROM companies c JOIN plans p ON p.id = c.plan_id
     WHERE c.plan_status = 'active' AND c.is_active = true`
  );
  return {
    ...result.rows[0],
    total_drivers: driverRes.rows[0].total_drivers,
    jobs_this_month: jobRes.rows[0].jobs_this_month,
    mrr: mrrRes.rows[0].mrr,
  };
}

async function listPlans() {
  const result = await query(
    'SELECT id, name, price_monthly, max_drivers, max_vehicles, is_active FROM plans ORDER BY price_monthly'
  );
  return result.rows;
}

module.exports = {
  listCompanies,
  getCompanyDetail,
  createCompany,
  setCompanyStatus,
  setCompanyPlan,
  updateCompanyNotes,
  getPlatformStats,
  listPlans,
};
