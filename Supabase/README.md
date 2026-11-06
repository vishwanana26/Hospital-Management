# Supabase Setup Guide for Smart Hospital Appointment Management System

This directory contains the database schema, constraints, indexes, Row Level Security (RLS) policies, and seed data for **Smart Hospital Appointment Management System**.

---

## 🚀 Quick Setup in Supabase Cloud

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **New Project**, select your organization, and name your project (e.g., `mrecw-hospital-system`).
3. Set a strong database password and choose your preferred region.
4. Click **Create new project** and wait for it to provision.

---

### Step 2: Run the Database Schema
1. In the Supabase Dashboard, click on the **SQL Editor** icon in the left navigation sidebar.
2. Click **+ New Query**.
3. Copy the entire content of [`schema.sql`](./schema.sql) and paste it into the editor.
4. Click **Run** (or press `Ctrl + Enter`).
5. You should see `Success. No rows returned` or the inserted seed rows.

All 6 core tables (`departments`, `users`, `doctors`, `patients`, `appointments`, `notifications`, `hospital_settings`) will be created with:
- **Unique double-booking prevention constraint** (`idx_prevent_double_booking`)
- Foreign keys with cascading updates
- Row Level Security (RLS) enabled
- Seed data with 6 departments, 6 doctors, 3 patients, active appointments, and notifications.

---

### Step 3: Connect to the Backend

1. In Supabase Dashboard, navigate to **Project Settings** > **API**.
2. Find:
   - **Project URL** (e.g., `https://xyzprojectid.supabase.co`)
   - **Project API Anon Key** (under Project API keys)
   - **Service Role Key** (secret key for server-side queries)
3. In the project's `Backend/` folder, create or edit `.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=mrecw_smart_hospital_super_secret_jwt_key_2026

   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```
4. Start the backend:
   ```bash
   cd Backend
   npm start
   ```

---

## ⚡ Offline / Local Mode (Zero-Config Fallback)

The backend also comes with an automatic **embedded ACID data store**.
If you do not configure Supabase credentials, the backend automatically runs in **Offline/Local Mode** with persistent JSON storage (`storage/db.json`), preloaded with the identical sample data.

This means you can run, test, and present the full application immediately without waiting for Supabase credentials! When you are ready to connect to Supabase Cloud, simply add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env`.

---

## 🔑 Default Demo Accounts

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@mrecw-hospital.com` | `admin123` | Hospital Chief Administrator |
| **Doctor** | `dr.sarah@mrecw-hospital.com` | `doctor123` | Dr. Sarah Smith (Cardiologist, Room 201) |
| **Doctor** | `dr.chen@mrecw-hospital.com` | `doctor123` | Dr. Michael Chen (Neurologist, Room 305) |
| **Patient** | `john.doe@gmail.com` | `patient123` | John Doe (Token #1 holder) |
| **Patient** | `emily.watson@gmail.com` | `patient123` | Emily Watson (Token #2 holder) |
| **Patient** | `aarav.patel@gmail.com` | `patient123` | Aarav Patel |

