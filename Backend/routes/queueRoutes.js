const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/queue/doctor/:doctorId?date=YYYY-MM-DD
// Public / authenticated: Live queue monitor for waiting room screens or patient view
router.get('/doctor/:doctorId', async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId;
    const dateString = req.query.date || new Date().toISOString().split('T')[0];

    const queueData = await db.getDoctorQueue(doctorId, dateString);
    res.json({ success: true, ...queueData });
  } catch (err) {
    next(err);
  }
});

// POST /api/queue/doctor/:doctorId/advance (Doctor only)
// Doctor calls next patient, advancing queue token
router.post('/doctor/:doctorId/advance', authenticateToken, requireRole('doctor', 'admin'), async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId;
    const dateString = req.body.date || new Date().toISOString().split('T')[0];

    // If doctor, ensure they only advance their own queue
    if (req.user.role === 'doctor') {
      const doc = await db.getDoctorByUserId(req.user.user_id);
      if (!doc || doc.doctor_id !== doctorId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to advance another doctor’s queue.' });
      }
    }

    const updatedQueue = await db.advanceDoctorQueue(doctorId, dateString);
    res.json({
      success: true,
      message: 'Queue advanced: next patient called.',
      ...updatedQueue
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/queue/patient/status
// Patient gets real-time position, people ahead, and turn approaching alert
router.get('/patient/status', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(400).json({ success: false, message: 'Endpoint for patient role only.' });
    }

    const patient = await db.getPatientByUserId(req.user.user_id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = await db.getAppointments({
      patientId: patient.patient_id,
      date: todayStr
    });

    const activeAppt = todayAppointments.find((a) => a.status === 'confirmed' || a.status === 'in_progress');

    if (!activeAppt) {
      return res.json({
        success: true,
        hasActiveTodayAppointment: false,
        message: 'No active appointments scheduled for today.'
      });
    }

    // Get doctor queue
    const queueData = await db.getDoctorQueue(activeAppt.doctor_id, todayStr);
    const myQueueEntry = queueData.queue.find((q) => q.appointment_id === activeAppt.appointment_id);

    res.json({
      success: true,
      hasActiveTodayAppointment: true,
      appointment: activeAppt,
      currentTokenServing: queueData.currentTokenServing,
      myTokenNumber: activeAppt.token_number,
      peopleAhead: myQueueEntry ? myQueueEntry.peopleAhead : 0,
      estimatedWaitMinutes: myQueueEntry ? myQueueEntry.estimatedWaitMinutes : 0,
      turnStatus: myQueueEntry ? myQueueEntry.turnStatus : 'unknown',
      doctor: queueData.doctor,
      isTurnApproaching: myQueueEntry && (myQueueEntry.peopleAhead <= 1 || myQueueEntry.turnStatus === 'now_serving')
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

