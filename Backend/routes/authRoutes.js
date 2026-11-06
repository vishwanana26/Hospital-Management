const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, role, date_of_birth, gender, blood_group, specialization, department_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const assignedRole = role && ['patient', 'doctor', 'admin'].includes(role) ? role : 'patient';

    const user = await db.createUser({
      name,
      email,
      phone,
      password_hash,
      role: assignedRole
    });

    let profile = null;
    if (assignedRole === 'patient') {
      profile = await db.createPatient({
        user_id: user.user_id,
        date_of_birth,
        gender,
        blood_group
      });
    } else if (assignedRole === 'doctor') {
      profile = await db.createDoctor({
        user_id: user.user_id,
        department_id: department_id || 'dept-1',
        specialization: specialization || 'General Physician'
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account successfully registered.',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url
      },
      profile
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    let profile = null;
    if (user.role === 'patient') {
      profile = await db.getPatientByUserId(user.user_id);
    } else if (user.role === 'doctor') {
      profile = await db.getDoctorByUserId(user.user_id);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url
      },
      profile
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    let profile = null;
    if (req.user.role === 'patient') {
      profile = await db.getPatientByUserId(req.user.user_id);
    } else if (req.user.role === 'doctor') {
      profile = await db.getDoctorByUserId(req.user.user_id);
    }

    res.json({
      success: true,
      user: req.user,
      profile
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/demo-users
router.get('/demo-users', async (req, res) => {
  res.json({
    success: true,
    users: [
      {
        role: 'patient',
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        label: 'Patient (John Doe)',
        description: 'Has active appointment & token tracking'
      },
      {
        role: 'doctor',
        name: 'Dr. Sarah Smith',
        email: 'dr.sarah@mrecw-hospital.com',
        label: 'Doctor (Dr. Sarah Smith)',
        description: 'Chief Cardiologist, manages queue & patients'
      },
      {
        role: 'admin',
        name: 'Hospital Administrator',
        email: 'admin@mrecw-hospital.com',
        label: 'Admin (Hospital Director)',
        description: 'Full analytics, doctor, and hospital settings'
      }
    ]
  });
});

// POST /api/auth/demo-login
router.post('/demo-login', async (req, res, next) => {
  try {
    const { role } = req.body;
    let targetEmail = 'john.doe@gmail.com';
    if (role === 'doctor') targetEmail = 'dr.sarah@mrecw-hospital.com';
    else if (role === 'admin') targetEmail = 'admin@mrecw-hospital.com';

    const user = await db.findUserByEmail(targetEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: `Demo user for role ${role} not found.` });
    }

    let profile = null;
    if (user.role === 'patient') {
      profile = await db.getPatientByUserId(user.user_id);
    } else if (user.role === 'doctor') {
      profile = await db.getDoctorByUserId(user.user_id);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: `Signed in as Demo ${user.name} (${user.role.toUpperCase()})`,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url
      },
      profile
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

