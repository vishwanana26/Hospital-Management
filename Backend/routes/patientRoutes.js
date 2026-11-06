const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/patients (Admin & Doctors can view all patients)
router.get('/', authenticateToken, requireRole('admin', 'doctor'), async (req, res, next) => {
  try {
    const patients = await db.getPatients();
    res.json({ success: true, count: patients.length, patients });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patient = await db.getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Security check: patients can only view their own profile
    if (req.user.role === 'patient') {
      const myProfile = await db.getPatientByUserId(req.user.user_id);
      if (!myProfile || myProfile.patient_id !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Access denied to other patients profiles.' });
      }
    }

    // Get patient's appointments
    const appointments = await db.getAppointments({ patientId: patient.patient_id });

    res.json({ success: true, patient, appointments });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:id (Update medical information / profile)
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const patientId = req.params.id;

    if (req.user.role === 'patient') {
      const myProfile = await db.getPatientByUserId(req.user.user_id);
      if (!myProfile || myProfile.patient_id !== patientId) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }
    }

    const { date_of_birth, gender, blood_group, emergency_contact, address, basic_medical_information } = req.body;
    const updated = await db.updatePatient(patientId, {
      ...(date_of_birth && { date_of_birth }),
      ...(gender && { gender }),
      ...(blood_group && { blood_group }),
      ...(emergency_contact && { emergency_contact }),
      ...(address && { address }),
      ...(basic_medical_information && { basic_medical_information })
    });

    res.json({ success: true, message: 'Patient profile updated', patient: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

