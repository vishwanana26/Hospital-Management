# Smart Hospital Appointment Management System (Digital Healthcare)

A web-based **Hospital Appointment & Queue Management System** designed to eliminate long waiting times, prevent slot conflicts, provide real-time OPD queue tracking, and offer dedicated dashboards for Patients, Doctors, and Hospital Administrators.

---

## 🌟 Key Features

### 1. Dedicated Initial Sign In & Registration Screen
- **First-Time Visitor Experience**: When the website or app is opened for the first time, users immediately arrive at a dedicated healthcare onboarding portal featuring:
  - **Sign In (Login)**: Secure access using registered email and password.
  - **Sign Up (Registration)**: Complete registration for new Patients (with Date of Birth, Gender, Blood Group) and Doctors (with Specialization, Department).
  - **1-Click Instant Demo Evaluation**: Direct 1-click test buttons for **Patient (John Doe)**, **Doctor (Dr. Sarah Smith)**, and **Admin (Hospital Director)**.
  - **Seamless Logout**: Clear logout button in the top navigation bar to return to the sign-in screen at any time.

### 2. Smart Appointment Booking
- **Atomic Double-Booking Prevention**: High-performance concurrency lock and database unique constraints guarantee that no two patients can reserve the same doctor slot at the same time.
- **Dynamic Slot Generation**: Automatically calculates available vs. booked consultation slots based on the doctor's shift hours (e.g. 09:00 AM - 05:00 PM), slot intervals (30 mins), and scheduled days off.
- **Digital E-Pass / Slip**: Generates an instant printable and downloadable appointment badge with Booking Reference (e.g., `MREC-2026-101`), sequential Token Number (`#1`), patient details, OPD room number, and contactless QR verification.

### 3. Dynamic UPI QR Code Scanner & Payment
- **Instant Checkout & Fee Breakdown**: After picking a doctor and slot, an interactive payment modal displays the consultation fee, OPD hospital registration fee, and total amount.
- **Dynamic UPI QR Code Scanner**: Interactive scanner box with an animated laser scan line, hospital UPI ID (`mrecw.hospital@icici`), and supported UPI app badges (Google Pay, PhonePe, Paytm, BHIM, Cred).
- **10-Minute Expiry Countdown**: Live countdown timer ensuring secure session validation.
- **Instant Payment Simulation**: Includes a simulated *"I Have Scanned & Paid"* instant approval button (with gateway latency simulation and unique Transaction ID generation), plus a *"Pay at OPD Counter on Arrival"* option.
- **Verified Payment Pass**: Automatically marks the appointment as `PAID`, records transaction reference, and generates the final Digital Appointment Pass with verified payment badge and receipt.

### 4. Live Waiting Room & Queue Tracking
- **Real-Time Token Display**: Live tracking of "Now Serving: Token #X" vs "Your Token: #Y".
- **Intelligent Wait Estimation**: Automatically computes people ahead in line and remaining wait minutes (`peopleAhead * consult_duration`).
- **Turn Approaching Alerts**: Visual and notification warning when the patient is next in line or when the doctor calls them into the consultation room.

### 4. Role-Based Dashboards & Interfaces

#### 👤 Patient Portal
- Search doctors by name, medical specialty, department, or day availability.
- View detailed doctor profile (qualifications, experience, fee, room).
- Book, reschedule, and cancel appointments with immediate slot release.
- Real-time notification center for booking confirmations and turn alerts.

#### 🩺 Doctor Portal
- Live OPD Consultation Console with active patient medical details, chief complaints, and symptoms.
- "Call Next Patient" queue advancement button that automatically marks the prior visit completed, summons the next token, and triggers turn notifications.
- Consultation notes and digital prescription logging.
- Shift hours, slot duration, and weekly availability management.

#### 🛡️ Hospital Administrator Portal
- Executive analytics: Total patients, active doctors, today's visits, queue load, and completion rates.
- Department load distribution charts.
- Doctor roster management (add doctors, assign departments, set fees and rooms).
- Department management.
- Master appointment registry with search and status filtering.
- Hospital working hours and emergency hotline configuration.

---

## 🏗️ Project Architecture & Tech Stack

```
MRECW/
├── Backend/                 # Node.js & Express.js REST API
│   ├── config/              # Supabase & environment configuration
│   ├── db/                  # Unified database layer (ACID store + Supabase adapter)
│   ├── middleware/          # JWT authentication, role guards, error handling
│   ├── routes/              # Auth, Doctors, Departments, Appointments, Queue, Admin
│   ├── storage/             # Persistent local JSON ACID database
│   ├── server.js            # Express server (serves API & Frontend)
│   └── package.json
├── Frontend/                # Modern Single-Page Application (HTML5, CSS3, ES6+)
│   ├── index.html           # Unified Patient, Doctor, and Admin interfaces & modals
│   ├── style.css            # Medical UI design system, glassmorphism, responsive
│   └── script.js            # Reactive state management, slot picker, live polling
└── Supabase/                # Database Architecture
    ├── schema.sql           # Complete PostgreSQL schema, RLS policies, seed data
    └── README.md            # Supabase Cloud deployment instructions
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Step 1: Install Dependencies & Start Server
```bash
cd Backend
npm install
npm start
```

The server will start on **`http://localhost:5000`**:
- **Application UI**: `http://localhost:5000`
- **REST API Base**: `http://localhost:5000/api`
- **Health Check**: `http://localhost:5000/api/health`

*(Note: The backend automatically serves the frontend at `http://localhost:5000` with zero extra servers or CORS issues!)*

---

## ⚡ Instant One-Click Demo Accounts

The top navigation bar features a **Demo Role Switcher** to let you test all three personas instantly with a single click:

| Role | Demo User | Email | Password | Access Details |
|---|---|---|---|---|
| **Patient** | John Doe | `john.doe@gmail.com` | `password123` | Has active Token #1, booking, and pass |
| **Patient** | Emily Watson | `emily.watson@gmail.com` | `password123` | Has Token #2 waiting in queue |
| **Doctor** | Dr. Sarah Smith | `dr.sarah@mrecw-hospital.com` | `password123` | Chief Cardiologist, Room 201 |
| **Doctor** | Dr. Michael Chen | `dr.chen@mrecw-hospital.com` | `password123` | Neurologist, Room 305 |
| **Admin** | Hospital Administrator | `admin@mrecw-hospital.com` | `password123` | Full hospital analytics & controls |

---

## 🗄️ Supabase / PostgreSQL Setup (Optional Cloud Mode)

The system works **100% out-of-the-box in local offline mode** using its built-in ACID database. If you wish to connect to a live Supabase cloud project:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and paste the contents of [`Supabase/schema.sql`](./Supabase/schema.sql).
3. Click **Run**.
4. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into `Backend/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Restart the backend (`npm start`). The system will automatically detect and bind to Supabase!

---

## 🔐 Security & Data Scoping
- **Role-Based Access Control (RBAC)**: Distinct permissions for `patient`, `doctor`, and `admin`.
- **JWT Authentication**: Secure Bearer tokens with encrypted payloads.
- **Password Protection**: Passwords hashed using `bcryptjs` with salt rounds.
- **Data Scoping**:
  - Patients can only view and manage their own appointments and notifications.
  - Doctors can only view appointments and patients assigned to them.
  - Admins maintain full institutional oversight.

"# Hospital-Appointment" 
