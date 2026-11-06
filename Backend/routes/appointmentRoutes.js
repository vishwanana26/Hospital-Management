const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/appointments (Book an appointment)
// Smart Double-Booking Prevention & Token Generation
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    let patient_id = req.body.patient_id;

    // If user is a patient, automatically associate with their patient profile
    if (req.user.role === 'patient') {
      const patient = await db.getPatientByUserId(req.user.user_id);
      if (!patient) {
        return res.status(400).json({ success: false, message: 'Patient profile not found for this account.' });
      }
      patient_id = patient.patient_id;
    } else if (!patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id is required.' });
    }

    const { doctor_id, department_id, appointment_date, appointment_time, reason, symptoms, payment_status, payment_method, transaction_id, amount_paid } = req.body;

    if (!doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, appointment date, and appointment time are required.'
      });
    }

    const appointment = await db.bookAppointment({
      patient_id,
      doctor_id,
      department_id,
      appointment_date,
      appointment_time,
      reason: reason || 'Consultation',
      symptoms,
      payment_status,
      payment_method,
      transaction_id,
      amount_paid
    });

    res.status(201).json({
      success: true,
      message: 'Appointment successfully booked and payment verified!',
      appointment
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments/:id/pay (Confirm / Update payment for appointment)
router.post('/:id/pay', authenticateToken, async (req, res, next) => {
  try {
    const { payment_method, transaction_id, amount_paid } = req.body;
    const updated = await db.confirmPayment(req.params.id, {
      payment_method,
      transaction_id,
      amount_paid
    });

    res.json({
      success: true,
      message: 'Payment received and verified successfully!',
      appointment: updated
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments
// Role-based filtering:
// - Patient: only their appointments
// - Doctor: only their appointments
// - Admin: all appointments with optional filters (?date=...&status=...&search=...)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { date, status, search, doctorId, patientId } = req.query;
    let filter = { date, status, search };

    if (req.user.role === 'patient') {
      const patient = await db.getPatientByUserId(req.user.user_id);
      if (!patient) return res.json({ success: true, appointments: [] });
      filter.patientId = patient.patient_id;
    } else if (req.user.role === 'doctor') {
      const doctor = await db.getDoctorByUserId(req.user.user_id);
      if (!doctor) return res.json({ success: true, appointments: [] });
      filter.doctorId = doctor.doctor_id;
    } else {
      // Admin can specify doctorId or patientId in query
      if (doctorId) filter.doctorId = doctorId;
      if (patientId) filter.patientId = patientId;
    }

    const appointments = await db.getAppointments(filter);
    res.json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const apt = await db.getAppointmentById(req.params.id);
    if (!apt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Security check: patients can only access their own appointments
    if (req.user.role === 'patient') {
      const patient = await db.getPatientByUserId(req.user.user_id);
      if (!patient || patient.patient_id !== apt.patient_id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.json({ success: true, appointment: apt });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id/status (Doctor & Admin)
router.put('/:id/status', authenticateToken, requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const { status, doctor_notes } = req.body;
    if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updated = await db.updateAppointmentStatus(req.params.id, status, doctor_notes);
    res.json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment: updated
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id/reschedule (Patient, Doctor, Admin)
router.put('/:id/reschedule', authenticateToken, async (req, res, next) => {
  try {
    const { appointment_date, appointment_time } = req.body;
    if (!appointment_date || !appointment_time) {
      return res.status(400).json({ success: false, message: 'New date and time are required.' });
    }

    const updated = await db.rescheduleAppointment(req.params.id, appointment_date, appointment_time);
    res.json({
      success: true,
      message: 'Appointment rescheduled successfully.',
      appointment: updated
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id/cancel
router.put('/:id/cancel', authenticateToken, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cancelled = await db.cancelAppointment(req.params.id, reason);
    res.json({
      success: true,
      message: 'Appointment cancelled successfully.',
      appointment: cancelled
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

