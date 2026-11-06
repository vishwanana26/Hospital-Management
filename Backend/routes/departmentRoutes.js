const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/departments
router.get('/', async (req, res, next) => {
  try {
    const departments = await db.getDepartments();
    res.json({ success: true, departments });
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const department = await db.getDepartmentById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    const doctors = await db.getDoctors({ departmentId: req.params.id });
    res.json({ success: true, department, doctors });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments (Admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { department_name, description, icon, head_of_department } = req.body;
    if (!department_name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }
    const created = await db.createDepartment({ department_name, description, icon, head_of_department });
    res.status(201).json({ success: true, department: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const updated = await db.updateDepartment(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    res.json({ success: true, department: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/departments/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const deleted = await db.deleteDepartment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

