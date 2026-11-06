// Seed data for Smart Hospital Appointment Management System
const bcrypt = require('bcryptjs');

// Default password hash for all demo users is 'password123'
const defaultPasswordHash = bcrypt.hashSync('password123', 10);

const getTodayDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const seedData = {
  departments: [
    {
      department_id: 'dept-1',
      department_name: 'Cardiology',
      description: 'Comprehensive cardiovascular care, ECG, echocardiography, hypertension and heart failure management.',
      icon: 'heart-pulse',
      head_of_department: 'Dr. Sarah Smith',
      created_at: new Date().toISOString()
    },
    {
      department_id: 'dept-2',
      department_name: 'Neurology',
      description: 'Expert diagnostics and treatments for brain, spinal cord, nerve disorders, migraines and epilepsy.',
      icon: 'brain',
      head_of_department: 'Dr. Michael Chen',
      created_at: new Date().toISOString()
    },
    {
      department_id: 'dept-3',
      department_name: 'Pediatrics',
      description: 'Dedicated child healthcare, pediatric immunizations, developmental milestones and infant wellness.',
      icon: 'baby',
      head_of_department: 'Dr. Priya Sharma',
      created_at: new Date().toISOString()
    },
    {
      department_id: 'dept-4',
      department_name: 'Orthopedics',
      description: 'Bone, joint, sports injuries, arthroscopic surgeries, fracture care and musculoskeletal recovery.',
      icon: 'bone',
      head_of_department: 'Dr. David Wilson',
      created_at: new Date().toISOString()
    },
    {
      department_id: 'dept-5',
      department_name: 'Dermatology',
      description: 'Advanced clinical and cosmetic dermatology, eczema, acne, allergy tests and skin cancer screening.',
      icon: 'sparkles',
      head_of_department: 'Dr. Elena Rostova',
      created_at: new Date().toISOString()
    },
    {
      department_id: 'dept-6',
      department_name: 'General Medicine',
      description: 'Primary medical care, health checkups, viral fevers, diabetes, hypertension and lifestyle disease control.',
      icon: 'activity',
      head_of_department: 'Dr. Robert Taylor',
      created_at: new Date().toISOString()
    }
  ],

  users: [
    // Admin
    {
      user_id: 'usr-admin-1',
      name: 'Admin Director',
      email: 'admin@mrecw-hospital.com',
      phone: '+91 98765 00001',
      password_hash: defaultPasswordHash,
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      created_at: new Date().toISOString()
    },
    // Doctors
    {
      user_id: 'usr-doc-1',
      name: 'Dr. Sarah Smith',
      email: 'dr.sarah@mrecw-hospital.com',
      phone: '+91 98765 10001',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-doc-2',
      name: 'Dr. Michael Chen',
      email: 'dr.chen@mrecw-hospital.com',
      phone: '+91 98765 10002',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      avatar_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-doc-3',
      name: 'Dr. Priya Sharma',
      email: 'dr.priya@mrecw-hospital.com',
      phone: '+91 98765 10003',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      avatar_url: 'https://images.unsplash.com/photo-1594824813633-898243832f2a?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-doc-4',
      name: 'Dr. David Wilson',
      email: 'dr.david@mrecw-hospital.com',
      phone: '+91 98765 10004',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      avatar_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-doc-5',
      name: 'Dr. Elena Rostova',
      email: 'dr.elena@mrecw-hospital.com',
      phone: '+91 98765 10005',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      avatar_url: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-doc-6',
      name: 'Dr. Robert Taylor',
      email: 'dr.robert@mrecw-hospital.com',
      phone: '+91 98765 10006',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      avatar_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      created_at: new Date().toISOString()
    },
    // Patients
    {
      user_id: 'usr-pat-1',
      name: 'John Doe',
      email: 'john.doe@gmail.com',
      phone: '+91 91234 56789',
      password_hash: defaultPasswordHash,
      role: 'patient',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-pat-2',
      name: 'Emily Watson',
      email: 'emily.watson@gmail.com',
      phone: '+91 91234 56790',
      password_hash: defaultPasswordHash,
      role: 'patient',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      created_at: new Date().toISOString()
    },
    {
      user_id: 'usr-pat-3',
      name: 'Aarav Patel',
      email: 'aarav.patel@gmail.com',
      phone: '+91 91234 56791',
      password_hash: defaultPasswordHash,
      role: 'patient',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      created_at: new Date().toISOString()
    }
  ],

  doctors: [
    {
      doctor_id: 'doc-1',
      user_id: 'usr-doc-1',
      department_id: 'dept-1',
      specialization: 'Senior Interventional Cardiologist',
      qualification: 'MBBS, MD (Cardiology), FACC',
      experience_years: 14,
      consultation_fee: 800,
      room_number: 'Room 201 (2nd Floor)',
      bio: 'Leading cardiologist with over 14 years of experience specializing in preventive cardiology, coronary angioplasty, hypertension, and advanced heart health monitoring.',
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00 AM',
      end_time: '04:00 PM',
      slot_duration_minutes: 30,
      rating: 4.9,
      is_active: true
    },
    {
      doctor_id: 'doc-2',
      user_id: 'usr-doc-2',
      department_id: 'dept-2',
      specialization: 'Consultant Neurologist',
      qualification: 'MBBS, DM (Neurology)',
      experience_years: 11,
      consultation_fee: 750,
      room_number: 'Room 305 (3rd Floor)',
      bio: 'Dedicated neurologist focusing on migraine treatment, seizure disorders, post-stroke neuro-rehabilitation, and peripheral neuropathies.',
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '10:00 AM',
      end_time: '05:00 PM',
      slot_duration_minutes: 30,
      rating: 4.8,
      is_active: true
    },
    {
      doctor_id: 'doc-3',
      user_id: 'usr-doc-3',
      department_id: 'dept-3',
      specialization: 'Chief Pediatric Specialist',
      qualification: 'MBBS, DCH, MD (Pediatrics)',
      experience_years: 9,
      consultation_fee: 600,
      room_number: 'Room 108 (1st Floor)',
      bio: 'Caring pediatrician offering holistic infant development tracking, pediatric nutrition guidance, childhood asthma care, and gentle immunization.',
      available_days: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '09:00 AM',
      end_time: '03:00 PM',
      slot_duration_minutes: 30,
      rating: 4.9,
      is_active: true
    },
    {
      doctor_id: 'doc-4',
      user_id: 'usr-doc-4',
      department_id: 'dept-4',
      specialization: 'Orthopedic & Joint Surgeon',
      qualification: 'MBBS, MS (Ortho), MCh',
      experience_years: 16,
      consultation_fee: 850,
      room_number: 'Room 214 (2nd Floor)',
      bio: 'Expert surgeon in total knee & hip replacement, sports ligament reconstructions, fracture repair, and chronic arthritis care.',
      available_days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '11:00 AM',
      end_time: '06:00 PM',
      slot_duration_minutes: 30,
      rating: 4.7,
      is_active: true
    },
    {
      doctor_id: 'doc-5',
      user_id: 'usr-doc-5',
      department_id: 'dept-5',
      specialization: 'Clinical & Aesthetic Dermatologist',
      qualification: 'MBBS, MD (DVL)',
      experience_years: 8,
      consultation_fee: 550,
      room_number: 'Room 112 (1st Floor)',
      bio: 'Specialist in skin allergy diagnoses, acne scars, psoriasis therapies, pediatric dermatology, and advanced clinical cosmetology.',
      available_days: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
      start_time: '09:30 AM',
      end_time: '04:30 PM',
      slot_duration_minutes: 30,
      rating: 4.8,
      is_active: true
    },
    {
      doctor_id: 'doc-6',
      user_id: 'usr-doc-6',
      department_id: 'dept-6',
      specialization: 'Senior General Physician',
      qualification: 'MBBS, MD (General Medicine)',
      experience_years: 12,
      consultation_fee: 500,
      room_number: 'Room 102 (1st Floor)',
      bio: 'Holistic practitioner for acute infections, viral illnesses, diabetes & cholesterol control, thyroid disorders, and routine preventive exams.',
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '09:00 AM',
      end_time: '05:00 PM',
      slot_duration_minutes: 30,
      rating: 4.8,
      is_active: true
    }
  ],

  patients: [
    {
      patient_id: 'pat-1',
      user_id: 'usr-pat-1',
      date_of_birth: '1990-05-14',
      gender: 'Male',
      blood_group: 'O+',
      emergency_contact: '+91 98765 43210',
      address: 'Plot 42, Hitech City, Hyderabad, Telangana',
      basic_medical_information: 'Mild seasonal asthma, no known drug allergies. Last checked blood pressure normal.'
    },
    {
      patient_id: 'pat-2',
      user_id: 'usr-pat-2',
      date_of_birth: '1995-11-20',
      gender: 'Female',
      blood_group: 'B+',
      emergency_contact: '+91 98765 43211',
      address: 'Flat 302, Green Valley Apartments, Hyderabad',
      basic_medical_information: 'History of migraine headaches triggered by bright light. Penicillin allergy.'
    },
    {
      patient_id: 'pat-3',
      user_id: 'usr-pat-3',
      date_of_birth: '1988-03-08',
      gender: 'Male',
      blood_group: 'A+',
      emergency_contact: '+91 98765 43212',
      address: 'House 19, Jubilee Hills, Hyderabad',
      basic_medical_information: 'Pre-diabetic, currently managed through diet and lifestyle modifications.'
    }
  ],

  appointments: [
    {
      appointment_id: 'apt-1',
      booking_reference: 'MREC-2026-101',
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      department_id: 'dept-1',
      appointment_date: getTodayDateString(0),
      appointment_time: '09:00 AM',
      token_number: 1,
      status: 'in_progress', // Active in consultation
      reason: 'Routine heart checkup and blood pressure assessment',
      symptoms: 'Occasional palpitation during workout',
      doctor_notes: 'Initial ECG reading looks steady. Recommended 24h Holter monitor.',
      booking_time: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      appointment_id: 'apt-2',
      booking_reference: 'MREC-2026-102',
      patient_id: 'pat-2',
      doctor_id: 'doc-1',
      department_id: 'dept-1',
      appointment_date: getTodayDateString(0),
      appointment_time: '09:30 AM',
      token_number: 2,
      status: 'confirmed', // Next in queue
      reason: 'Follow-up for chest tightness',
      symptoms: 'Mild chest discomfort when climbing stairs',
      doctor_notes: null,
      booking_time: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      appointment_id: 'apt-3',
      booking_reference: 'MREC-2026-103',
      patient_id: 'pat-3',
      doctor_id: 'doc-1',
      department_id: 'dept-1',
      appointment_date: getTodayDateString(0),
      appointment_time: '10:00 AM',
      token_number: 3,
      status: 'confirmed', // 2nd in queue
      reason: 'Annual cardiac health consultation',
      symptoms: 'Family history of cardiovascular issues',
      doctor_notes: null,
      booking_time: new Date(Date.now() - 12 * 3600000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      appointment_id: 'apt-4',
      booking_reference: 'MREC-2026-104',
      patient_id: 'pat-1',
      doctor_id: 'doc-2',
      department_id: 'dept-2',
      appointment_date: getTodayDateString(1),
      appointment_time: '10:30 AM',
      token_number: 1,
      status: 'confirmed',
      reason: 'Persistent tension headache and neck stiffness',
      symptoms: 'Throbbing headache lasting > 3 days',
      doctor_notes: null,
      booking_time: new Date(Date.now() - 6 * 3600000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      appointment_id: 'apt-5',
      booking_reference: 'MREC-2026-105',
      patient_id: 'pat-2',
      doctor_id: 'doc-5',
      department_id: 'dept-5',
      appointment_date: getTodayDateString(-2),
      appointment_time: '11:00 AM',
      token_number: 1,
      status: 'completed',
      reason: 'Skin rash and allergic reaction consult',
      symptoms: 'Itchy red patches on forearm',
      doctor_notes: 'Diagnosed contact dermatitis. Prescribed topical hydrocortisone and antihistamines. Resolved.',
      booking_time: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],

  notifications: [
    {
      notification_id: 'notif-1',
      user_id: 'usr-pat-1',
      title: 'Appointment In Progress!',
      message: 'Dr. Sarah Smith is now consulting Token #1 (Ref: MREC-2026-101). Please be in Room 201 (2nd Floor).',
      notification_type: 'queue_alert',
      read_status: false,
      appointment_id: 'apt-1',
      created_at: new Date().toISOString()
    },
    {
      notification_id: 'notif-2',
      user_id: 'usr-pat-2',
      title: 'Queue Update: Turn Approaching!',
      message: 'You are Token #2 for Dr. Sarah Smith. You are next in line! Estimated wait: ~15 mins.',
      notification_type: 'queue_alert',
      read_status: false,
      appointment_id: 'apt-2',
      created_at: new Date().toISOString()
    },
    {
      notification_id: 'notif-3',
      user_id: 'usr-pat-1',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Michael Chen tomorrow at 10:30 AM has been confirmed (Ref: MREC-2026-104).',
      notification_type: 'booking_confirmed',
      read_status: true,
      appointment_id: 'apt-4',
      created_at: new Date().toISOString()
    },
    {
      notification_id: 'notif-4',
      user_id: 'usr-doc-1',
      title: 'Patient Queue Active',
      message: 'You have 3 scheduled appointments today. First patient John Doe is ready.',
      notification_type: 'reminder',
      read_status: true,
      appointment_id: 'apt-1',
      created_at: new Date().toISOString()
    }
  ],

  hospital_settings: {
    hospital_name: 'MRECW Smart Multi-Speciality Hospital',
    hospital_address: 'Maisammaguda, Dhulapally, Secunderabad, Telangana 500100',
    hospital_phone: '+91 40 2379 2154',
    hospital_emergency: '108 / +91 40 2379 2999',
    working_hours: '08:00 AM - 08:00 PM',
    queue_refresh_seconds: 15,
    slot_interval_minutes: 30
  }
};

module.exports = { seedData, getTodayDateString };

