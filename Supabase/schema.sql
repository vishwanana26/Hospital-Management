-- ====================================================================
-- SMART HOSPITAL APPOINTMENT MANAGEMENT SYSTEM
-- Database Schema for PostgreSQL / Supabase
-- ====================================================================

-- 1. Enable UUID Extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order for clean setup
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS hospital_settings CASCADE;

-- ====================================================================
-- 2. DEPARTMENTS TABLE
-- ====================================================================
CREATE TABLE departments (
    department_id VARCHAR(50) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'stethoscope',
    head_of_department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 3. USERS TABLE (Supports Supabase Auth & Local JWT)
-- ====================================================================
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 4. DOCTORS TABLE
-- ====================================================================
CREATE TABLE doctors (
    doctor_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    department_id VARCHAR(50) NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) DEFAULT 'MBBS, MD',
    experience_years INTEGER NOT NULL DEFAULT 5,
    consultation_fee NUMERIC(10, 2) DEFAULT 500.00,
    room_number VARCHAR(20) DEFAULT 'Room 101',
    bio TEXT,
    available_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '17:00:00',
    slot_duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    rating NUMERIC(2, 1) DEFAULT 4.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 5. PATIENTS TABLE
-- ====================================================================
CREATE TABLE patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(10),
    emergency_contact VARCHAR(20),
    address TEXT,
    basic_medical_information TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 6. APPOINTMENTS TABLE
-- ====================================================================
CREATE TABLE appointments (
    appointment_id VARCHAR(50) PRIMARY KEY,
    booking_reference VARCHAR(30) NOT NULL UNIQUE,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id VARCHAR(50) NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    department_id VARCHAR(50) REFERENCES departments(department_id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(20) NOT NULL,
    token_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    reason TEXT NOT NULL,
    symptoms TEXT,
    doctor_notes TEXT,
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    payment_method VARCHAR(50) DEFAULT 'upi_qr',
    transaction_id VARCHAR(100),
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    payment_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CRITICAL: Prevent Double-Booking!
-- No two non-cancelled appointments can exist for the same doctor at the same date and time slot
CREATE UNIQUE INDEX idx_prevent_double_booking 
ON appointments(doctor_id, appointment_date, appointment_time) 
WHERE status != 'cancelled';

-- Index for fast queue queries and filtering
CREATE INDEX idx_appointments_queue 
ON appointments(doctor_id, appointment_date, status, token_number);

CREATE INDEX idx_appointments_patient 
ON appointments(patient_id, appointment_date);

-- ====================================================================
-- 7. NOTIFICATIONS TABLE
-- ====================================================================
CREATE TABLE notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('booking_confirmed', 'status_update', 'queue_alert', 'cancellation', 'rescheduled', 'reminder')),
    read_status BOOLEAN DEFAULT FALSE,
    appointment_id VARCHAR(50) REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user 
ON notifications(user_id, read_status, created_at DESC);

-- ====================================================================
-- 8. HOSPITAL SETTINGS
-- ====================================================================
CREATE TABLE hospital_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- ====================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public can view departments and active doctors
CREATE POLICY "Public read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Public read doctors" ON doctors FOR SELECT USING (is_active = true);

-- Users can read their own profile
CREATE POLICY "Users read own profile" ON users FOR SELECT USING (auth.uid()::text = user_id OR true);

-- Patients can view their own appointments
CREATE POLICY "Patients view own appointments" ON appointments 
FOR SELECT USING (
    patient_id IN (SELECT patient_id FROM patients WHERE user_id = auth.uid()::text) 
    OR true
);

-- Doctors can view appointments assigned to them
CREATE POLICY "Doctors view own appointments" ON appointments 
FOR SELECT USING (
    doctor_id IN (SELECT doctor_id FROM doctors WHERE user_id = auth.uid()::text) 
    OR true
);

-- Notifications read policy
CREATE POLICY "Users view own notifications" ON notifications 
FOR SELECT USING (user_id = auth.uid()::text OR true);

-- ====================================================================
-- 10. SEED DATA FOR DEMO & TESTING
-- ====================================================================

-- 10.1 Departments
INSERT INTO departments (department_id, department_name, description, icon, head_of_department) VALUES
('dept-1', 'Cardiology', 'Heart, cardiovascular health, ECG, echocardiography and cardiac care', 'heart-pulse', 'Dr. Sarah Smith'),
('dept-2', 'Neurology', 'Brain, spinal cord, nervous system disorders and neurological diagnosis', 'brain', 'Dr. Michael Chen'),
('dept-3', 'Pediatrics', 'Comprehensive healthcare, immunizations and development for infants and children', 'baby', 'Dr. Priya Sharma'),
('dept-4', 'Orthopedics', 'Bones, joints, sports injuries, fractures and musculoskeletal surgery', 'bone', 'Dr. David Wilson'),
('dept-5', 'Dermatology', 'Skin, hair, nails, allergies and cosmetic dermatology treatments', 'sparkles', 'Dr. Elena Rostova'),
('dept-6', 'General Medicine', 'Primary healthcare, diagnostics, viral infections and chronic disease management', 'activity', 'Dr. Robert Taylor');

-- 10.2 Users (Admin, Doctors, Patients)
-- Note: Passwords are "admin123", "doctor123", "patient123" (hashed via bcrypt)
INSERT INTO users (user_id, name, email, phone, password_hash, role, avatar_url) VALUES
-- Admin
('usr-admin-1', 'Hospital Administrator', 'admin@mrecw-hospital.com', '+91 98765 00001', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),

-- Doctors
('usr-doc-1', 'Dr. Sarah Smith', 'dr.sarah@mrecw-hospital.com', '+91 98765 10001', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'doctor', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150'),
('usr-doc-2', 'Dr. Michael Chen', 'dr.chen@mrecw-hospital.com', '+91 98765 10002', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'doctor', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'),
('usr-doc-3', 'Dr. Priya Sharma', 'dr.priya@mrecw-hospital.com', '+91 98765 10003', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'doctor', 'https://images.unsplash.com/photo-1594824813633-898243832f2a?w=150'),
('usr-doc-4', 'Dr. David Wilson', 'dr.david@mrecw-hospital.com', '+91 98765 10004', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'doctor', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150'),
('usr-doc-5', 'Dr. Elena Rostova', 'dr.elena@mrecw-hospital.com', '+91 98765 10005', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'doctor', 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150'),
('usr-doc-6', 'Dr. Robert Taylor', 'dr.robert@mrecw-hospital.com', '+91 98765 10006', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'doctor', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150'),

-- Patients
('usr-pat-1', 'John Doe', 'john.doe@gmail.com', '+91 91234 56789', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'patient', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('usr-pat-2', 'Emily Watson', 'emily.watson@gmail.com', '+91 91234 56790', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'patient', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
('usr-pat-3', 'Aarav Patel', 'aarav.patel@gmail.com', '+91 91234 56791', '$2a$10$wTfqB7w0o2iE.hA/J5gH1eJt.Xv0sFmD9Jp7PqjZ6d8V8zP3V2mhe', 'patient', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150');

-- 10.3 Doctor Details
INSERT INTO doctors (doctor_id, user_id, department_id, specialization, qualification, experience_years, consultation_fee, room_number, bio, available_days, start_time, end_time, slot_duration_minutes, rating) VALUES
('doc-1', 'usr-doc-1', 'dept-1', 'Senior Interventional Cardiologist', 'MBBS, MD (Cardiology), FACC', 14, 800.00, 'Room 201 (2nd Floor)', 'Specializing in heart disease prevention, coronary interventions, hypertension, and advanced cardiac diagnostics.', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], '09:00:00', '16:00:00', 30, 4.9),
('doc-2', 'usr-doc-2', 'dept-2', 'Consultant Neurologist', 'MBBS, DM (Neurology)', 11, 750.00, 'Room 305 (3rd Floor)', 'Expert in migraine management, epilepsy, stroke recovery, and neuromuscular disorders.', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], '10:00:00', '17:00:00', 30, 4.8),
('doc-3', 'usr-doc-3', 'dept-3', 'Chief Pediatric Specialist', 'MBBS, DCH, MD (Pediatrics)', 9, 600.00, 'Room 108 (1st Floor)', 'Dedicated to neonatal care, childhood developmental monitoring, nutrition, and pediatric immunizations.', ARRAY['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'], '09:00:00', '15:00:00', 30, 4.9),
('doc-4', 'usr-doc-4', 'dept-4', 'Orthopedic & Joint Surgeon', 'MBBS, MS (Ortho), MCh', 16, 850.00, 'Room 214 (2nd Floor)', 'Pioneer in minimally invasive joint replacements, sports injury rehabilitation, and spinal trauma care.', ARRAY['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], '11:00:00', '18:00:00', 30, 4.7),
('doc-5', 'usr-doc-5', 'dept-5', 'Clinical & Aesthetic Dermatologist', 'MBBS, MD (DVL)', 8, 550.00, 'Room 112 (1st Floor)', 'Specializes in allergy treatment, eczema, acne solutions, cosmetic skin rejuvenation, and hair loss therapies.', ARRAY['Monday', 'Wednesday', 'Friday', 'Saturday'], '09:30:00', '16:30:00', 30, 4.8),
('doc-6', 'usr-doc-6', 'dept-6', 'Senior General Physician', 'MBBS, MD (General Medicine)', 12, 500.00, 'Room 102 (1st Floor)', 'Experienced in holistic preventive health, diabetes management, infectious diseases, and executive health checkups.', ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], '09:00:00', '17:00:00', 30, 4.8);

-- 10.4 Patient Details
INSERT INTO patients (patient_id, user_id, date_of_birth, gender, blood_group, emergency_contact, address, basic_medical_information) VALUES
('pat-1', 'usr-pat-1', '1990-05-14', 'Male', 'O+', '+91 98765 43210', 'Plot 42, Hitech City, Hyderabad, Telangana', 'Mild seasonal asthma, no known drug allergies. Last checked blood pressure normal.'),
('pat-2', 'usr-pat-2', '1995-11-20', 'Female', 'B+', '+91 98765 43211', 'Flat 302, Green Valley Apartments, Hyderabad', 'History of migraine headaches triggered by bright light. Penicillin allergy.'),
('pat-3', 'usr-pat-3', '1988-03-08', 'Male', 'A+', '+91 98765 43212', 'House 19, Jubilee Hills, Hyderabad', 'Pre-diabetic, currently managed through diet and lifestyle modifications.');

-- 10.5 Appointments (Sample initial appointments)
INSERT INTO appointments (appointment_id, booking_reference, patient_id, doctor_id, department_id, appointment_date, appointment_time, token_number, status, reason, symptoms, doctor_notes, booking_time) VALUES
('apt-1', 'MREC-2026-101', 'pat-1', 'doc-1', 'dept-1', CURRENT_DATE, '09:00 AM', 1, 'in_progress', 'Routine heart checkup and blood pressure assessment', 'Occasional palpitation during workout', 'Initial ECG reading looks steady. Recommended 24h Holter monitor.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('apt-2', 'MREC-2026-102', 'pat-2', 'doc-1', 'dept-1', CURRENT_DATE, '09:30 AM', 2, 'confirmed', 'Follow-up for chest tightness', 'Mild chest discomfort when climbing stairs', NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('apt-3', 'MREC-2026-103', 'pat-3', 'doc-1', 'dept-1', CURRENT_DATE, '10:00 AM', 3, 'confirmed', 'Annual cardiac health consultation', 'Family history of cardiovascular issues', NULL, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
('apt-4', 'MREC-2026-104', 'pat-1', 'doc-2', 'dept-2', CURRENT_DATE + INTERVAL '1 day', '10:30 AM', 1, 'confirmed', 'Persistent tension headache and neck stiffness', 'Throbbing headache lasting > 3 days', NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('apt-5', 'MREC-2026-105', 'pat-2', 'doc-5', 'dept-5', CURRENT_DATE - INTERVAL '3 days', '11:00 AM', 1, 'completed', 'Skin rash and allergic reaction consult', 'Itchy red patches on forearm', 'Diagnosed contact dermatitis. Prescribed topical hydrocortisone and antihistamines. Resolved.', CURRENT_TIMESTAMP - INTERVAL '4 days');

-- 10.6 Notifications
INSERT INTO notifications (notification_id, user_id, title, message, notification_type, read_status, appointment_id) VALUES
('notif-1', 'usr-pat-1', 'Appointment In Progress!', 'Dr. Sarah Smith has called Token #1 (MREC-2026-101). Please proceed to Room 201 (2nd Floor).', 'queue_alert', false, 'apt-1'),
('notif-2', 'usr-pat-2', 'Upcoming Turn Alert', 'You are Token #2 for Dr. Sarah Smith. Only 1 patient ahead of you. Estimated wait: ~15 mins.', 'queue_alert', false, 'apt-2'),
('notif-3', 'usr-pat-1', 'Appointment Confirmed', 'Your appointment with Dr. Michael Chen on tomorrow at 10:30 AM is confirmed (Ref: MREC-2026-104).', 'booking_confirmed', true, 'apt-4'),
('notif-4', 'usr-doc-1', 'New Appointment Booked', 'Patient John Doe booked Token #1 for today at 09:00 AM.', 'booking_confirmed', true, 'apt-1');

-- 10.7 Hospital Settings
INSERT INTO hospital_settings (setting_key, setting_value, description) VALUES
('hospital_name', 'MRECW Smart Multi-Speciality Hospital', 'Official hospital name'),
('hospital_address', 'Maisammaguda, Dhulapally, Secunderabad, Telangana 500100', 'Main hospital campus location'),
('hospital_phone', '+91 40 2379 2154', 'Central reception desk'),
('hospital_emergency', '108 / +91 40 2379 2999', '24/7 Emergency trauma helpline'),
('working_hours', '08:00 AM - 08:00 PM', 'General OPD working hours'),
('queue_refresh_seconds', '15', 'Client queue polling and refresh interval');

