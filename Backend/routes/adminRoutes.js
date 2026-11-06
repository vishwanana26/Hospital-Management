const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All admin routes require admin role
router.use(authenticateToken, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.getAdminStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await db.getHospitalSettings();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req, res, next) => {
  try {
    const updated = await db.updateHospitalSettings(req.body);
    res.json({ success: true, message: 'Hospital settings saved', settings: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/doctors (All doctors including inactive)
router.get('/doctors', async (req, res, next) => {
  try {
    const doctors = await db.getDoctors();
    res.json({ success: true, doctors });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/patients (All patients with details)
router.get('/patients', async (req, res, next) => {
  try {
    const patients = await db.getPatients();
    res.json({ success: true, patients });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

