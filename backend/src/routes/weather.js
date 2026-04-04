const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authenticateVendor } = require('../middleware/vendorAuth');

const router = express.Router();

// Allow both tenant users and vendor users to call this
function flexAuth(req, res, next) {
  authenticate(req, res, (err) => {
    if (!err && req.user) return next();
    authenticateVendor(req, res, next);
  });
}

router.get('/', flexAuth, async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Weather service not configured' });

    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
