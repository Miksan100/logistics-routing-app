require(''dotenv'').config();
const express = require(''express'');
const cors = require(''cors'');
const helmet = require(''helmet'');
const rateLimit = require(''express-rate-limit'');

const authRoutes = require(''./routes/auth'');
const driverRoutes = require(''./routes/drivers'');
const vehicleRoutes = require(''./routes/vehicles'');
const jobRoutes = require(''./routes/jobs'');
const odometerRoutes = require(''./routes/odometer'');
const trackingRoutes = require(''./routes/tracking'');
const analyticsRoutes = require(''./routes/analytics'');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ''http://localhost:3000'',
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: ''Too many requests, please try again later.'' },
}));

app.use(express.json({ limit: ''10mb'' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get(''/health'', (_req, res) => res.json({ status: ''ok'', timestamp: new Date().toISOString() }));

// Routes
app.use(''/api/auth'', authRoutes);
app.use(''/api/drivers'', driverRoutes);
app.use(''/api/vehicles'', vehicleRoutes);
app.use(''/api/jobs'', jobRoutes);
app.use(''/api/odometer'', odometerRoutes);
app.use(''/api/tracking'', trackingRoutes);
app.use(''/api/analytics'', analyticsRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: ''Not found'' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || ''Internal server error'' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log();
});

module.exports = app;
