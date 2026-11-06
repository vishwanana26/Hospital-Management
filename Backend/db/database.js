const fs = require('fs');
const path = require('path');
const { seedData } = require('./seedData');
const { supabase, isSupabaseActive } = require('../config/supabase');

const STORAGE_DIR = path.join(__dirname, '../storage');
const DB_FILE = path.join(STORAGE_DIR, 'db.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-Memory state synced to disk
let memoryDB = null;

// Concurrency mutex lock for atomic booking
let isBookingLocked = false;
const acquireLock = async () => {
  while (isBookingLocked) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  isBookingLocked = true;
};
const releaseLock = () => {
  isBookingLocked = false;
};

// Load database from file or initialize with seed data
const loadDB = () => {
  if (memoryDB) return memoryDB;

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      memoryDB = JSON.parse(data);
      console.log('[Database] Loaded existing database from disk.');
      return memoryDB;
    } catch (err) {
      console.error('[Database] Corrupt db file, re-initializing seed data.', err.message);
    }
  }

  // Deep clone seedData
  memoryDB = JSON.parse(JSON.stringify(seedData));
  saveDB();
  console.log('[Database] Initialized new database with seed data.');
  return memoryDB;
};

const saveDB = () => {
  if (!memoryDB) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf8');
  } catch (err) {
    console.error('[Database] Failed to save database file:', err.message);
  }
};

// Initialize on startup
loadDB();

// Unique ID generators
const generateId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateBookingRef = () => `MREC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

// ====================================================================
// DATABASE ABSTRACTION METHODS
// ====================================================================

// --- USERS ---
const findUserByEmail = async (email) => {
  const db = loadDB();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
};

const findUserById = async (id) => {
  const db = loadDB();
  return db.users.find((u) => u.user_id === id);
};

const createUser = async ({ name, email, phone, password_hash, role, avatar_url }) => {
  const db = loadDB();
  const newUser = {
    user_id: generateId('usr'),
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    password_hash,
    role: role || 'patient',
    avatar_url: avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  saveDB();
  return newUser;
};

// --- DEPARTMENTS ---
const getDepartments = async () => {
  const db = loadDB();
  return db.departments;
};

const getDepartmentById = async (id) => {
  const db = loadDB();
  return db.departments.find((d) => d.department_id === id);
};

const createDepartment = async ({ department_name, description, icon, head_of_department }) => {
  const db = loadDB();
  const newDept = {
    department_id: generateId('dept'),
    department_name,
    description: description || '',
    icon: icon || 'activity',
    head_of_department: head_of_department || '',
    created_at: new Date().toISOString()
  };
  db.departments.push(newDept);
  saveDB();
  return newDept;
};

const updateDepartment = async (id, data) => {
  const db = loadDB();
  const idx = db.departments.findIndex((d) => d.department_id === id);
  if (idx === -1) return null;
  db.departments[idx] = { ...db.departments[idx], ...data };
  saveDB();
  return db.departments[idx];
};

const deleteDepartment = async (id) => {
  const db = loadDB();
  const idx = db.departments.findIndex((d) => d.department_id === id);
  if (idx === -1) return false;
  db.departments.splice(idx, 1);
  saveDB();
  return true;
};

// --- DOCTORS ---
const getDoctors = async ({ departmentId, search, day } = {}) => {
  const db = loadDB();
  return db.doctors
    .filter((doc) => doc.is_active)
    .map((doc) => {
      const user = db.users.find((u) => u.user_id === doc.user_id) || {};
      const dept = db.departments.find((d) => d.department_id === doc.department_id) || {};
      return {
        ...doc,
        name: user.name || 'Doctor',
        email: user.email || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
        department_name: dept.department_name || 'General'
      };
    })
    .filter((doc) => {
      if (departmentId && doc.department_id !== departmentId) return false;
      if (day && !doc.available_days.includes(day)) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesSpec = doc.specialization.toLowerCase().includes(query);
        const matchesDept = doc.department_name.toLowerCase().includes(query);
        if (!matchesName && !matchesSpec && !matchesDept) return false;
      }
      return true;
    });
};

const getDoctorById = async (doctorId) => {
  const db = loadDB();
  const doc = db.doctors.find((d) => d.doctor_id === doctorId);
  if (!doc) return null;
  const user = db.users.find((u) => u.user_id === doc.user_id) || {};
  const dept = db.departments.find((d) => d.department_id === doc.department_id) || {};
  return {
    ...doc,
    name: user.name || 'Doctor',
    email: user.email || '',
    phone: user.phone || '',
    avatar_url: user.avatar_url || '',
    department_name: dept.department_name || 'General'
  };
};

const getDoctorByUserId = async (userId) => {
  const db = loadDB();
  const doc = db.doctors.find((d) => d.user_id === userId);
  if (!doc) return null;
  return getDoctorById(doc.doctor_id);
};

const createDoctor = async ({ user_id, department_id, specialization, qualification, experience_years, consultation_fee, room_number, bio, available_days, start_time, end_time, slot_duration_minutes }) => {
  const db = loadDB();
  const newDoctor = {
    doctor_id: generateId('doc'),
    user_id,
    department_id,
    specialization,
    qualification: qualification || 'MBBS, MD',
    experience_years: Number(experience_years) || 5,
    consultation_fee: Number(consultation_fee) || 500,
    room_number: room_number || 'OPD Room 101',
    bio: bio || 'Qualified healthcare specialist committed to patient well-being.',
    available_days: available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    start_time: start_time || '09:00 AM',
    end_time: end_time || '05:00 PM',
    slot_duration_minutes: Number(slot_duration_minutes) || 30,
    rating: 4.8,
    is_active: true,
    created_at: new Date().toISOString()
  };
  db.doctors.push(newDoctor);
  saveDB();
  return getDoctorById(newDoctor.doctor_id);
};

const updateDoctor = async (doctorId, data) => {
  const db = loadDB();
  const idx = db.doctors.findIndex((d) => d.doctor_id === doctorId);
  if (idx === -1) return null;
  db.doctors[idx] = { ...db.doctors[idx], ...data };
  saveDB();
  return getDoctorById(doctorId);
};

// Generate Available Time Slots for Doctor on Date
const getDoctorAvailableSlots = async (doctorId, dateString) => {
  const doc = await getDoctorById(doctorId);
  if (!doc) throw new Error('Doctor not found');

  // Parse day name (e.g., 'Monday')
  const dateObj = new Date(dateString);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  const isDayAvailable = doc.available_days.includes(dayName);

  // Generate standard slots based on doctor start and end time
  const parseHourMinute = (timeStr) => {
    // Expected format: "09:00 AM" or "09:00"
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return { hour: 9, minute: 0 };
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const meridian = match[3];
    if (meridian) {
      if (meridian.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (meridian.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }
    return { hour, minute };
  };

  const start = parseHourMinute(doc.start_time || '09:00 AM');
  const end = parseHourMinute(doc.end_time || '17:00 PM');
  const duration = doc.slot_duration_minutes || 30;

  const generatedSlots = [];
  let currentMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  while (currentMinutes + duration <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const meridian = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const formatted = `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridian}`;
    generatedSlots.push(formatted);
    currentMinutes += duration;
  }

  // Get already booked appointments for this doctor on this date (not cancelled)
  const db = loadDB();
  const bookedSlots = db.appointments
    .filter((a) => a.doctor_id === doctorId && a.appointment_date === dateString && a.status !== 'cancelled')
    .map((a) => a.appointment_time);

  // Build slot status
  const slotsWithStatus = generatedSlots.map((time) => {
    const isBooked = bookedSlots.includes(time);
    return {
      time,
      isAvailable: isDayAvailable && !isBooked,
      isBooked,
      reason: !isDayAvailable ? 'Doctor off on this day' : isBooked ? 'Already booked' : 'Available'
    };
  });

  return {
    doctor: {
      doctor_id: doc.doctor_id,
      name: doc.name,
      specialization: doc.specialization,
      room_number: doc.room_number,
      consultation_fee: doc.consultation_fee
    },
    date: dateString,
    dayName,
    isWorkingDay: isDayAvailable,
    availableSlotsCount: slotsWithStatus.filter((s) => s.isAvailable).length,
    slots: slotsWithStatus
  };
};

// --- PATIENTS ---
const getPatients = async () => {
  const db = loadDB();
  return db.patients.map((pat) => {
    const user = db.users.find((u) => u.user_id === pat.user_id) || {};
    return {
      ...pat,
      name: user.name || 'Patient',
      email: user.email || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || ''
    };
  });
};

const getPatientById = async (patientId) => {
  const db = loadDB();
  const pat = db.patients.find((p) => p.patient_id === patientId);
  if (!pat) return null;
  const user = db.users.find((u) => u.user_id === pat.user_id) || {};
  return {
    ...pat,
    name: user.name || 'Patient',
    email: user.email || '',
    phone: user.phone || '',
    avatar_url: user.avatar_url || ''
  };
};

const getPatientByUserId = async (userId) => {
  const db = loadDB();
  const pat = db.patients.find((p) => p.user_id === userId);
  if (!pat) return null;
  return getPatientById(pat.patient_id);
};

const createPatient = async ({ user_id, date_of_birth, gender, blood_group, emergency_contact, address, basic_medical_information }) => {
  const db = loadDB();
  const newPatient = {
    patient_id: generateId('pat'),
    user_id,
    date_of_birth: date_of_birth || '1995-01-01',
    gender: gender || 'Other',
    blood_group: blood_group || 'O+',
    emergency_contact: emergency_contact || '',
    address: address || '',
    basic_medical_information: basic_medical_information || 'No major pre-existing conditions.',
    created_at: new Date().toISOString()
  };
  db.patients.push(newPatient);
  saveDB();
  return getPatientById(newPatient.patient_id);
};

const updatePatient = async (patientId, data) => {
  const db = loadDB();
  const idx = db.patients.findIndex((p) => p.patient_id === patientId);
  if (idx === -1) return null;
  db.patients[idx] = { ...db.patients[idx], ...data };
  saveDB();
  return getPatientById(patientId);
};

// --- APPOINTMENTS & ATOMIC BOOKING ---
const enrichAppointment = (apt, db) => {
  const patient = db.patients.find((p) => p.patient_id === apt.patient_id) || {};
  const patientUser = db.users.find((u) => u.user_id === patient.user_id) || {};
  const doctor = db.doctors.find((d) => d.doctor_id === apt.doctor_id) || {};
  const doctorUser = db.users.find((u) => u.user_id === doctor.user_id) || {};
  const department = db.departments.find((dep) => dep.department_id === (apt.department_id || doctor.department_id)) || {};

  return {
    ...apt,
    patient_name: patientUser.name || 'Patient',
    patient_email: patientUser.email || '',
    patient_phone: patientUser.phone || '',
    patient_gender: patient.gender || '',
    patient_dob: patient.date_of_birth || '',
    patient_blood_group: patient.blood_group || '',
    doctor_name: doctorUser.name || 'Doctor',
    doctor_specialization: doctor.specialization || '',
    doctor_room: doctor.room_number || '',
    consultation_fee: doctor.consultation_fee || 500,
    department_name: department.department_name || 'General'
  };
};

const getAppointments = async ({ patientId, doctorId, date, status, search } = {}) => {
  const db = loadDB();
  let list = db.appointments.map((apt) => enrichAppointment(apt, db));

  if (patientId) list = list.filter((a) => a.patient_id === patientId);
  if (doctorId) list = list.filter((a) => a.doctor_id === doctorId);
  if (date) list = list.filter((a) => a.appointment_date === date);
  if (status && status !== 'all') list = list.filter((a) => a.status === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((a) =>
      a.booking_reference.toLowerCase().includes(q) ||
      a.patient_name.toLowerCase().includes(q) ||
      a.doctor_name.toLowerCase().includes(q) ||
      a.department_name.toLowerCase().includes(q)
    );
  }

  // Sort: upcoming date & token number first
  return list.sort((a, b) => {
    if (a.appointment_date !== b.appointment_date) {
      return b.appointment_date.localeCompare(a.appointment_date);
    }
    return a.token_number - b.token_number;
  });
};

const getAppointmentById = async (appointmentId) => {
  const db = loadDB();
  const apt = db.appointments.find((a) => a.appointment_id === appointmentId);
  if (!apt) return null;
  return enrichAppointment(apt, db);
};

// CRITICAL: Atomic Double-Booking Prevention
const bookAppointment = async ({
  patient_id,
  doctor_id,
  department_id,
  appointment_date,
  appointment_time,
  reason,
  symptoms,
  payment_status,
  payment_method,
  transaction_id,
  amount_paid
}) => {
  await acquireLock();
  try {
    const db = loadDB();

    // 1. Verify doctor exists
    const doctor = db.doctors.find((d) => d.doctor_id === doctor_id);
    if (!doctor || !doctor.is_active) {
      throw new Error('Selected doctor is currently not available.');
    }

    // 2. Prevent Double Booking: check if slot is already occupied by a non-cancelled booking
    const slotConflict = db.appointments.some((a) =>
      a.doctor_id === doctor_id &&
      a.appointment_date === appointment_date &&
      a.appointment_time.toLowerCase().trim() === appointment_time.toLowerCase().trim() &&
      a.status !== 'cancelled'
    );

    if (slotConflict) {
      const err = new Error(`Slot ${appointment_time} on ${appointment_date} has just been booked by another patient. Please choose another slot.`);
      err.statusCode = 409;
      throw err;
    }

    // 3. Prevent duplicate active booking by the same patient for the same doctor on the same day
    const patientDuplicate = db.appointments.some((a) =>
      a.patient_id === patient_id &&
      a.doctor_id === doctor_id &&
      a.appointment_date === appointment_date &&
      a.status !== 'cancelled'
    );
    if (patientDuplicate) {
      const err = new Error('You already have an active appointment scheduled with this doctor on this day.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Calculate Sequential Token Number for Doctor on that day
    const dayAppointments = db.appointments.filter((a) =>
      a.doctor_id === doctor_id &&
      a.appointment_date === appointment_date
    );
    const token_number = dayAppointments.length + 1;

    // 5. Create new appointment with Payment Info
    const calculatedFee = Number(amount_paid) || (doctor.consultation_fee ? Number(doctor.consultation_fee) + 50 : 850);
    const resolvedTxn = transaction_id || `TXN-UPI-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment = {
      appointment_id: generateId('apt'),
      booking_reference: generateBookingRef(),
      patient_id,
      doctor_id,
      department_id: department_id || doctor.department_id,
      appointment_date,
      appointment_time,
      token_number,
      status: 'confirmed',
      reason: reason || 'General medical consultation',
      symptoms: symptoms || '',
      doctor_notes: null,
      payment_status: payment_status || 'paid',
      payment_method: payment_method || 'upi_qr',
      transaction_id: resolvedTxn,
      amount_paid: calculatedFee,
      payment_time: new Date().toISOString(),
      booking_time: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.appointments.push(newAppointment);
    saveDB();

    // 6. Automatically generate notifications
    const patient = db.patients.find((p) => p.patient_id === patient_id);
    const doctorUser = db.users.find((u) => u.user_id === doctor.user_id);
    const patientUser = patient ? db.users.find((u) => u.user_id === patient.user_id) : null;

    if (patient && patient.user_id) {
      createNotificationSync(db, {
        user_id: patient.user_id,
        title: 'Appointment & Payment Confirmed! 🎉',
        message: `Your appointment with ${doctorUser ? doctorUser.name : 'Doctor'} on ${appointment_date} at ${appointment_time} is confirmed. Token #${token_number}. ₹${calculatedFee} received via UPI QR (Ref: ${newAppointment.booking_reference}, Txn: ${resolvedTxn}).`,
        notification_type: 'booking_confirmed',
        appointment_id: newAppointment.appointment_id
      });
    }

    if (doctor && doctor.user_id) {
      createNotificationSync(db, {
        user_id: doctor.user_id,
        title: 'New Appointment Booked 🩺',
        message: `New booking: ${patientUser ? patientUser.name : 'Patient'} reserved Token #${token_number} on ${appointment_date} at ${appointment_time} (Paid ₹${calculatedFee}).`,
        notification_type: 'booking_confirmed',
        appointment_id: newAppointment.appointment_id
      });
    }

    saveDB();
    return enrichAppointment(newAppointment, db);
  } finally {
    releaseLock();
  }
};

const confirmPayment = async (appointmentId, { payment_method, transaction_id, amount_paid } = {}) => {
  const db = loadDB();
  const apt = db.appointments.find((a) => a.appointment_id === appointmentId);
  if (!apt) throw new Error('Appointment not found');

  apt.payment_status = 'paid';
  apt.payment_method = payment_method || 'upi_qr';
  apt.transaction_id = transaction_id || `TXN-UPI-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  if (amount_paid) apt.amount_paid = Number(amount_paid);
  apt.payment_time = new Date().toISOString();
  apt.updated_at = new Date().toISOString();

  saveDB();
  return enrichAppointment(apt, db);
};

const updateAppointmentStatus = async (appointmentId, newStatus, doctorNotes = null) => {
  const db = loadDB();
  const idx = db.appointments.findIndex((a) => a.appointment_id === appointmentId);
  if (idx === -1) throw new Error('Appointment not found');

  const apt = db.appointments[idx];
  apt.status = newStatus;
  apt.updated_at = new Date().toISOString();
  if (doctorNotes !== null) {
    apt.doctor_notes = doctorNotes;
  }

  // Notify patient about status change
  const patient = db.patients.find((p) => p.patient_id === apt.patient_id);
  const doctor = db.doctors.find((d) => d.doctor_id === apt.doctor_id);
  const doctorUser = doctor ? db.users.find((u) => u.user_id === doctor.user_id) : null;

  if (patient && patient.user_id) {
    let title = 'Appointment Status Update';
    let message = `Your appointment (${apt.booking_reference}) status is now ${newStatus.toUpperCase()}.`;
    let type = 'status_update';

    if (newStatus === 'in_progress') {
      title = 'Doctor Calling You! 🔔';
      message = `${doctorUser ? doctorUser.name : 'Doctor'} is ready for Token #${apt.token_number}. Please proceed to ${doctor ? doctor.room_number : 'the consultation room'}.`;
      type = 'queue_alert';
    } else if (newStatus === 'completed') {
      title = 'Consultation Completed ✅';
      message = `Your consultation with ${doctorUser ? doctorUser.name : 'Doctor'} has been completed. Digital prescription and notes are available in your portal.`;
      type = 'status_update';
    } else if (newStatus === 'cancelled') {
      title = 'Appointment Cancelled ❌';
      message = `Your appointment (${apt.booking_reference}) has been cancelled.`;
      type = 'cancellation';
    }

    createNotificationSync(db, {
      user_id: patient.user_id,
      title,
      message,
      notification_type: type,
      appointment_id: apt.appointment_id
    });
  }

  saveDB();
  return enrichAppointment(apt, db);
};

const rescheduleAppointment = async (appointmentId, newDate, newTime) => {
  await acquireLock();
  try {
    const db = loadDB();
    const idx = db.appointments.findIndex((a) => a.appointment_id === appointmentId);
    if (idx === -1) throw new Error('Appointment not found');

    const apt = db.appointments[idx];

    // Check if new slot is free
    const conflict = db.appointments.some((a) =>
      a.appointment_id !== appointmentId &&
      a.doctor_id === apt.doctor_id &&
      a.appointment_date === newDate &&
      a.appointment_time.toLowerCase().trim() === newTime.toLowerCase().trim() &&
      a.status !== 'cancelled'
    );

    if (conflict) {
      const err = new Error(`Slot ${newTime} on ${newDate} is already reserved.`);
      err.statusCode = 409;
      throw err;
    }

    apt.appointment_date = newDate;
    apt.appointment_time = newTime;
    apt.status = 'confirmed';
    apt.updated_at = new Date().toISOString();

    const patient = db.patients.find((p) => p.patient_id === apt.patient_id);
    if (patient && patient.user_id) {
      createNotificationSync(db, {
        user_id: patient.user_id,
        title: 'Appointment Rescheduled 📅',
        message: `Your appointment has been rescheduled to ${newDate} at ${newTime} (Ref: ${apt.booking_reference}).`,
        notification_type: 'rescheduled',
        appointment_id: apt.appointment_id
      });
    }

    saveDB();
    return enrichAppointment(apt, db);
  } finally {
    releaseLock();
  }
};

const cancelAppointment = async (appointmentId, reason = '') => {
  const db = loadDB();
  const idx = db.appointments.findIndex((a) => a.appointment_id === appointmentId);
  if (idx === -1) throw new Error('Appointment not found');

  const apt = db.appointments[idx];
  apt.status = 'cancelled';
  apt.doctor_notes = reason ? `Cancellation reason: ${reason}` : apt.doctor_notes;
  apt.updated_at = new Date().toISOString();

  const patient = db.patients.find((p) => p.patient_id === apt.patient_id);
  if (patient && patient.user_id) {
    createNotificationSync(db, {
      user_id: patient.user_id,
      title: 'Appointment Cancelled 🚫',
      message: `Your appointment ${apt.booking_reference} scheduled for ${apt.appointment_date} at ${apt.appointment_time} has been cancelled.`,
      notification_type: 'cancellation',
      appointment_id: apt.appointment_id
    });
  }

  saveDB();
  return enrichAppointment(apt, db);
};

// --- QUEUE MANAGEMENT ---
const getDoctorQueue = async (doctorId, dateString) => {
  const db = loadDB();
  const doctor = await getDoctorById(doctorId);
  if (!doctor) throw new Error('Doctor not found');

  const dayAppointments = db.appointments
    .filter((a) => a.doctor_id === doctorId && a.appointment_date === dateString && a.status !== 'cancelled')
    .map((a) => enrichAppointment(a, db))
    .sort((a, b) => a.token_number - b.token_number);

  // Current token in progress
  const currentConsultation = dayAppointments.find((a) => a.status === 'in_progress');
  const currentToken = currentConsultation ? currentConsultation.token_number : 0;

  // Next in queue
  const waitingList = dayAppointments.filter((a) => a.status === 'confirmed');
  const nextToken = waitingList.length > 0 ? waitingList[0].token_number : null;

  // Estimated average consultation time
  const avgConsultMins = doctor.slot_duration_minutes || 20;

  // Enhance each appointment with queue wait metrics
  const queueItems = dayAppointments.map((apt) => {
    let peopleAhead = 0;
    let estimatedWaitMinutes = 0;
    let turnStatus = 'upcoming';

    if (apt.status === 'completed') {
      turnStatus = 'completed';
    } else if (apt.status === 'in_progress') {
      turnStatus = 'now_serving';
    } else if (apt.status === 'confirmed') {
      // Count how many confirmed appointments have a lower token number
      peopleAhead = dayAppointments.filter(
        (other) => other.status === 'confirmed' && other.token_number < apt.token_number
      ).length + (currentConsultation ? 1 : 0);

      estimatedWaitMinutes = peopleAhead * avgConsultMins;

      if (peopleAhead === 0 && !currentConsultation) {
        turnStatus = 'ready_next';
      } else if (peopleAhead <= 1) {
        turnStatus = 'approaching';
      } else {
        turnStatus = 'waiting';
      }
    }

    return {
      ...apt,
      peopleAhead,
      estimatedWaitMinutes,
      turnStatus
    };
  });

  return {
    doctor: {
      doctor_id: doctor.doctor_id,
      name: doctor.name,
      specialization: doctor.specialization,
      room_number: doctor.room_number,
      avatar_url: doctor.avatar_url
    },
    date: dateString,
    currentTokenServing: currentToken,
    currentPatient: currentConsultation ? {
      token_number: currentConsultation.token_number,
      patient_name: currentConsultation.patient_name,
      booking_reference: currentConsultation.booking_reference,
      time: currentConsultation.appointment_time
    } : null,
    nextTokenNumber: nextToken,
    totalBooked: dayAppointments.length,
    totalCompleted: dayAppointments.filter((a) => a.status === 'completed').length,
    totalWaiting: waitingList.length,
    estimatedWaitTimePerPatientMins: avgConsultMins,
    queue: queueItems
  };
};

const advanceDoctorQueue = async (doctorId, dateString) => {
  const db = loadDB();
  const dayAppointments = db.appointments
    .filter((a) => a.doctor_id === doctorId && a.appointment_date === dateString && a.status !== 'cancelled')
    .sort((a, b) => a.token_number - b.token_number);

  // 1. If there's an appointment in_progress, complete it
  const currentInConsult = dayAppointments.find((a) => a.status === 'in_progress');
  if (currentInConsult) {
    currentInConsult.status = 'completed';
    currentInConsult.updated_at = new Date().toISOString();
  }

  // 2. Find next confirmed appointment
  const nextConfirmed = dayAppointments.find((a) => a.status === 'confirmed');
  if (nextConfirmed) {
    nextConfirmed.status = 'in_progress';
    nextConfirmed.updated_at = new Date().toISOString();

    // Notify called patient
    const patient = db.patients.find((p) => p.patient_id === nextConfirmed.patient_id);
    const doctor = db.doctors.find((d) => d.doctor_id === doctorId);
    const doctorUser = doctor ? db.users.find((u) => u.user_id === doctor.user_id) : null;

    if (patient && patient.user_id) {
      createNotificationSync(db, {
        user_id: patient.user_id,
        title: 'Turn Calling: Please Enter Room! 🔔',
        message: `Your Token #${nextConfirmed.token_number} is being called now by ${doctorUser ? doctorUser.name : 'Doctor'} in ${doctor ? doctor.room_number : 'OPD'}.`,
        notification_type: 'queue_alert',
        appointment_id: nextConfirmed.appointment_id
      });
    }

    // Also notify next patient that their turn is approaching
    const upcomingNext = dayAppointments.find(
      (a) => a.status === 'confirmed' && a.token_number > nextConfirmed.token_number
    );
    if (upcomingNext) {
      const nextPat = db.patients.find((p) => p.patient_id === upcomingNext.patient_id);
      if (nextPat && nextPat.user_id) {
        createNotificationSync(db, {
          user_id: nextPat.user_id,
          title: 'Turn Approaching! ⏳',
          message: `You are Token #${upcomingNext.token_number}. Only 1 patient ahead of you. Please wait near ${doctor ? doctor.room_number : 'the doctor consultation room'}.`,
          notification_type: 'queue_alert',
          appointment_id: upcomingNext.appointment_id
        });
      }
    }
  }

  saveDB();
  return getDoctorQueue(doctorId, dateString);
};

// --- NOTIFICATIONS ---
const createNotificationSync = (db, { user_id, title, message, notification_type, appointment_id }) => {
  const newNotif = {
    notification_id: generateId('notif'),
    user_id,
    title,
    message,
    notification_type: notification_type || 'status_update',
    read_status: false,
    appointment_id: appointment_id || null,
    created_at: new Date().toISOString()
  };
  db.notifications.unshift(newNotif);
  return newNotif;
};

const getUserNotifications = async (userId) => {
  const db = loadDB();
  return db.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

const markNotificationRead = async (notificationId, userId) => {
  const db = loadDB();
  const notif = db.notifications.find((n) => n.notification_id === notificationId && n.user_id === userId);
  if (!notif) return null;
  notif.read_status = true;
  saveDB();
  return notif;
};

const markAllNotificationsRead = async (userId) => {
  const db = loadDB();
  db.notifications
    .filter((n) => n.user_id === userId)
    .forEach((n) => {
      n.read_status = true;
    });
  saveDB();
  return true;
};

// --- ADMIN STATS & HOSPITAL SETTINGS ---
const getAdminStats = async () => {
  const db = loadDB();
  const todayStr = new Date().toISOString().split('T')[0];

  const totalPatients = db.patients.length;
  const totalDoctors = db.doctors.filter((d) => d.is_active).length;
  const totalDepartments = db.departments.length;
  const totalAppointments = db.appointments.length;

  const todayAppointments = db.appointments.filter((a) => a.appointment_date === todayStr);
  const completedAppointments = db.appointments.filter((a) => a.status === 'completed');
  const cancelledAppointments = db.appointments.filter((a) => a.status === 'cancelled');
  const activeConfirmed = db.appointments.filter((a) => a.status === 'confirmed' || a.status === 'in_progress');

  // Breakdown by department
  const departmentStats = db.departments.map((dept) => {
    const count = db.appointments.filter((a) => {
      const doc = db.doctors.find((d) => d.doctor_id === a.doctor_id);
      return doc && doc.department_id === dept.department_id;
    }).length;
    return {
      department_id: dept.department_id,
      department_name: dept.department_name,
      appointment_count: count
    };
  });

  return {
    metrics: {
      totalPatients,
      totalDoctors,
      totalDepartments,
      totalAppointments,
      todayAppointmentsCount: todayAppointments.length,
      todayCompletedCount: todayAppointments.filter((a) => a.status === 'completed').length,
      totalCompleted: completedAppointments.length,
      totalCancelled: cancelledAppointments.length,
      activeConfirmedCount: activeConfirmed.length
    },
    departmentStats,
    recentAppointments: db.appointments
      .slice(-10)
      .reverse()
      .map((a) => enrichAppointment(a, db)),
    settings: db.hospital_settings
  };
};

const getHospitalSettings = async () => {
  const db = loadDB();
  return db.hospital_settings;
};

const updateHospitalSettings = async (settings) => {
  const db = loadDB();
  db.hospital_settings = { ...db.hospital_settings, ...settings };
  saveDB();
  return db.hospital_settings;
};

module.exports = {
  loadDB,
  saveDB,
  findUserByEmail,
  findUserById,
  createUser,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDoctors,
  getDoctorById,
  getDoctorByUserId,
  createDoctor,
  updateDoctor,
  getDoctorAvailableSlots,
  getPatients,
  getPatientById,
  getPatientByUserId,
  createPatient,
  updatePatient,
  getAppointments,
  getAppointmentById,
  bookAppointment,
  confirmPayment,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  getDoctorQueue,
  advanceDoctorQueue,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAdminStats,
  getHospitalSettings,
  updateHospitalSettings
};

