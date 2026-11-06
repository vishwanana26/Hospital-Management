const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mrecw_smart_hospital_super_secret_jwt_key_2026';

const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.user_id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token: User no longer exists.' });
    }

    req.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    };

    // If patient or doctor, attach role-specific record ID
    if (user.role === 'patient') {
      const patient = await db.getPatientByUserId(user.user_id);
      if (patient) req.patient = patient;
    } else if (user.role === 'doctor') {
      const doctor = await db.getDoctorByUserId(user.user_id);
      if (doctor) req.doctor = doctor;
    }

    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}]. Current role: ${req.user.role}`
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.user_id);
    if (user) {
      req.user = user;
      if (user.role === 'patient') {
        req.patient = await db.getPatientByUserId(user.user_id);
      } else if (user.role === 'doctor') {
        req.doctor = await db.getDoctorByUserId(user.user_id);
      }
    }
  } catch (err) {
    // silently continue without authenticated user
  }
  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole,
  optionalAuth
};

