const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/doctors (search by name, specialization, department, availability)
router.get('/', async (req, res, next) => {
  try {
    const { departmentId, search, day } = req.query;
    const doctors = await db.getDoctors({ departmentId, search, day });
    res.json({ success: true, count: doctors.length, doctors });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res, next) => {
  try {
    const doctor = await db.getDoctorById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, doctor });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/:id/slots?date=YYYY-MM-DD
// Critical feature: Smart slot generator that shows Available vs Booked
router.get('/:id/slots', async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const dateString = req.query.date || new Date().toISOString().split('T')[0];

    const slotData = await db.getDoctorAvailableSlots(doctorId, dateString);
    res.json({ success: true, ...slotData });
  } catch (err) {
    next(err);
  }
});

// PUT /api/doctors/:id/availability (Doctor self-update or Admin)
router.put('/:id/availability', authenticateToken, async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    // Verify permissions: user is admin or the doctor themselves
    if (req.user.role !== 'admin') {
      const currentDoc = await db.getDoctorByUserId(req.user.user_id);
      if (!currentDoc || currentDoc.doctor_id !== doctorId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to modify another doctor’s schedule.' });
      }
    }

    const { available_days, start_time, end_time, slot_duration_minutes, consultation_fee, room_number } = req.body;
    const updated = await db.updateDoctor(doctorId, {
      ...(available_days && { available_days }),
      ...(start_time && { start_time }),
      ...(end_time && { end_time }),
      ...(slot_duration_minutes && { slot_duration_minutes: Number(slot_duration_minutes) }),
      ...(consultation_fee && { consultation_fee: Number(consultation_fee) }),
      ...(room_number && { room_number })
    });

    res.json({ success: true, message: 'Doctor schedule updated successfully', doctor: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors (Admin create doctor)
router.post('/', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, phone, specialization, department_id, qualification, experience_years, consultation_fee, room_number, bio, available_days, start_time, end_time } = req.body;

    const bcrypt = require('bcryptjs');
    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash('doctor123', 10);
    const user = await db.createUser({
      name,
      email,
      phone,
      password_hash,
      role: 'doctor',
      avatar_url: `https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150`
    });

    const doctor = await db.createDoctor({
      user_id: user.user_id,
      department_id,
      specialization,
      qualification,
      experience_years,
      consultation_fee,
      room_number,
      bio,
      available_days,
      start_time,
      end_time
    });

    res.status(201).json({ success: true, doctor });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

