/**
 * SMART HOSPITAL APPOINTMENT MANAGEMENT SYSTEM
 * Frontend Application Controller
 * Handles Patient, Doctor, and Admin workflows, live queue tracking,
 * slot booking, notifications, and role transitions.
 */

// Global App State
const state = {
  token: localStorage.getItem('mrecw_token') || null,
  currentUser: null,
  currentRole: localStorage.getItem('mrecw_role') || 'patient',
  departments: [],
  doctors: [],
  todayAppointments: [],
  activeDoctorId: 'doc-1', // Default for doctor view
  pollingInterval: null,
  pendingBooking: null,
  lastBookedAppt: null,
  paymentCountdownInterval: null
};

// API Base URL (Relative for seamless local & deployed serving)
const API_BASE = '/api';

// ====================================================================
// INITIALIZATION
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupModalDismissals();

  // Initialize Auth or Demo Session
  await initializeSession();

  // Initial Data Load
  await loadDepartments();
  await loadDoctors();

  // Setup periodic polling for queue and notifications
  startRealtimePolling();
});

// Setup Real-time polling (every 10 seconds)
function startRealtimePolling() {
  if (state.pollingInterval) clearInterval(state.pollingInterval);
  state.pollingInterval = setInterval(async () => {
    if (state.token) {
      await fetchNotifications();
      if (state.currentRole === 'patient') {
        await updatePatientQueueStatus();
      } else if (state.currentRole === 'doctor') {
        await refreshDoctorQueue();
      }
    }
  }, 10000);
}

// ====================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ====================================================================
async function initializeSession() {
  try {
    if (state.token) {
      const res = await apiRequest('/auth/me');
      if (res && res.success) {
        state.currentUser = res.user;
        state.currentRole = res.user.role;
        showMainApp(res.user, res.user.role);
        return;
      }
    }
    // First time visitor or logged out: Always show Sign Up / Sign In screen
    showAuthScreen();
  } catch (err) {
    console.warn('Session verification error, showing login screen:', err.message);
    state.token = null;
    localStorage.removeItem('mrecw_token');
    showAuthScreen();
  }
}

function showAuthScreen() {
  const authScreen = document.getElementById('authScreen');
  const mainApp = document.getElementById('mainAppView');
  if (authScreen) authScreen.style.display = 'flex';
  if (mainApp) mainApp.style.display = 'none';

  if (state.pollingInterval) {
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
  }
}

function showMainApp(user, role) {
  const authScreen = document.getElementById('authScreen');
  const mainApp = document.getElementById('mainAppView');
  if (authScreen) authScreen.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';

  state.currentUser = user;
  state.currentRole = role;
  updateUserUI();
  switchPortalView(role);
  startRealtimePolling();
  fetchNotifications();
}

function logout() {
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem('mrecw_token');
  localStorage.removeItem('mrecw_role');

  showToast('You have been logged out successfully.', 'info');
  showAuthScreen();
}

async function switchDemoRole(role) {
  try {
    const res = await apiRequest('/auth/demo-login', 'POST', { role });
    if (res && res.success) {
      state.token = res.token;
      state.currentUser = res.user;
      state.currentRole = res.user.role;
      localStorage.setItem('mrecw_token', res.token);
      localStorage.setItem('mrecw_role', res.user.role);

      showMainApp(res.user, res.user.role);
      showToast(`Signed in as Demo ${res.user.name} (${res.user.role.toUpperCase()})`, 'success');
    }
  } catch (err) {
    showToast('Failed to switch demo role: ' + err.message, 'danger');
  }
}

async function handleMainLogin(e) {
  e.preventDefault();
  const email = document.getElementById('authLoginEmail').value;
  const password = document.getElementById('authLoginPassword').value;
  const btn = document.getElementById('btnSubmitLogin');

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await apiRequest('/auth/login', 'POST', { email, password });
    if (res && res.success) {
      state.token = res.token;
      state.currentUser = res.user;
      state.currentRole = res.user.role;
      localStorage.setItem('mrecw_token', res.token);
      localStorage.setItem('mrecw_role', res.user.role);

      showMainApp(res.user, res.user.role);
      showToast(`Welcome back, ${res.user.name}! 👋`, 'success');
    }
  } catch (err) {
    showToast('Login failed: ' + err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg> Sign In to Portal';
  }
}

async function handleMainRegister(e) {
  e.preventDefault();
  const name = document.getElementById('authRegName').value;
  const email = document.getElementById('authRegEmail').value;
  const phone = document.getElementById('authRegPhone').value;
  const password = document.getElementById('authRegPassword').value;
  const role = document.querySelector('input[name="regRole"]:checked')?.value || 'patient';

  const payload = { name, email, phone, password, role };

  if (role === 'patient') {
    payload.date_of_birth = document.getElementById('authRegDob')?.value;
    payload.gender = document.getElementById('authRegGender')?.value;
    payload.blood_group = document.getElementById('authRegBlood')?.value;
  } else if (role === 'doctor') {
    payload.specialization = document.getElementById('authRegSpec')?.value || 'General Physician';
    payload.department_id = document.getElementById('authRegDept')?.value || 'dept-1';
  }

  const btn = document.getElementById('btnSubmitRegister');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const res = await apiRequest('/auth/register', 'POST', payload);
    if (res && res.success) {
      state.token = res.token;
      state.currentUser = res.user;
      state.currentRole = res.user.role;
      localStorage.setItem('mrecw_token', res.token);
      localStorage.setItem('mrecw_role', res.user.role);

      showMainApp(res.user, res.user.role);
      showToast(`Account registered successfully! Welcome, ${res.user.name}. 🎉`, 'success');
    }
  } catch (err) {
    showToast('Registration failed: ' + err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" x2="20" y1="8" y2="14"/><line x1="23" x2="17" y1="11" y2="11"/></svg> Complete Registration';
  }
}

function updateUserUI() {
  if (!state.currentUser) return;

  const navName = document.getElementById('navUserName');
  const navRole = document.getElementById('navUserRole');
  const navAvatar = document.getElementById('navAvatar');

  if (navName) navName.textContent = state.currentUser.name;
  if (navRole) navRole.textContent = state.currentUser.role.toUpperCase();
  if (navAvatar && state.currentUser.avatar_url) navAvatar.src = state.currentUser.avatar_url;

  // Update Role Switcher Pills
  document.querySelectorAll('.role-pill').forEach(pill => {
    pill.classList.remove('active', 'doctor-active', 'admin-active');
    if (pill.dataset.role === state.currentRole) {
      pill.classList.add('active');
      if (state.currentRole === 'doctor') pill.classList.add('doctor-active');
      if (state.currentRole === 'admin') pill.classList.add('admin-active');
    }
  });

  // Patient greeting
  const greeting = document.getElementById('patientGreeting');
  if (greeting && state.currentRole === 'patient') {
    greeting.textContent = `Hello, ${state.currentUser.name} 👋`;
  }
}

function switchPortalView(role) {
  document.querySelectorAll('.portal-view').forEach(p => p.classList.remove('active'));

  if (role === 'patient') {
    const p = document.getElementById('patientPortal');
    if (p) p.classList.add('active');
    loadPatientDashboard();
  } else if (role === 'doctor') {
    const p = document.getElementById('doctorPortal');
    if (p) p.classList.add('active');
    loadDoctorDashboard();
  } else if (role === 'admin') {
    const p = document.getElementById('adminPortal');
    if (p) p.classList.add('active');
    loadAdminDashboard();
  }
}

// ====================================================================
// EVENT LISTENERS
// ====================================================================
function setupEventListeners() {
  // Auth Screen Tab Switcher (Sign In vs Sign Up)
  const authTabLogin = document.getElementById('authTabLogin');
  const authTabRegister = document.getElementById('authTabRegister');
  const authLoginPanel = document.getElementById('authLoginPanel');
  const authRegisterPanel = document.getElementById('authRegisterPanel');
  const linkToRegister = document.getElementById('linkSwitchToRegister');
  const linkToLogin = document.getElementById('linkSwitchToLogin');

  function switchToLoginTab() {
    if (authTabLogin) authTabLogin.classList.add('active');
    if (authTabRegister) authTabRegister.classList.remove('active');
    if (authLoginPanel) authLoginPanel.style.display = 'block';
    if (authRegisterPanel) authRegisterPanel.style.display = 'none';
  }

  function switchToRegisterTab() {
    if (authTabRegister) authTabRegister.classList.add('active');
    if (authTabLogin) authTabLogin.classList.remove('active');
    if (authRegisterPanel) authRegisterPanel.style.display = 'block';
    if (authLoginPanel) authLoginPanel.style.display = 'none';
  }

  if (authTabLogin) authTabLogin.addEventListener('click', switchToLoginTab);
  if (authTabRegister) authTabRegister.addEventListener('click', switchToRegisterTab);
  if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); switchToRegisterTab(); });
  if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); switchToLoginTab(); });

  // Registration Role Selector (Patient vs Doctor)
  const optRolePatient = document.getElementById('optRolePatient');
  const optRoleDoctor = document.getElementById('optRoleDoctor');
  const patientExtra = document.getElementById('patientExtraFields');
  const doctorExtra = document.getElementById('doctorExtraFields');

  if (optRolePatient && optRoleDoctor) {
    optRolePatient.addEventListener('click', () => {
      optRolePatient.classList.add('selected');
      optRoleDoctor.classList.remove('selected');
      const radio = optRolePatient.querySelector('input');
      if (radio) radio.checked = true;
      if (patientExtra) patientExtra.style.display = 'block';
      if (doctorExtra) doctorExtra.style.display = 'none';
    });

    optRoleDoctor.addEventListener('click', () => {
      optRoleDoctor.classList.add('selected');
      optRolePatient.classList.remove('selected');
      const radio = optRoleDoctor.querySelector('input');
      if (radio) radio.checked = true;
      if (doctorExtra) doctorExtra.style.display = 'block';
      if (patientExtra) patientExtra.style.display = 'none';
    });
  }

  // Auth Main Form Handlers
  const authLoginForm = document.getElementById('authMainLoginForm');
  if (authLoginForm) authLoginForm.addEventListener('submit', handleMainLogin);

  const authRegisterForm = document.getElementById('authMainRegisterForm');
  if (authRegisterForm) authRegisterForm.addEventListener('submit', handleMainRegister);

  // Quick Demo Buttons on Auth Screen
  document.querySelectorAll('.auth-demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const demoRole = btn.dataset.demo;
      switchDemoRole(demoRole);
    });
  });

  // Logout button in Navbar
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Role switcher pills (inside main dashboard)
  document.querySelectorAll('.role-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const role = pill.dataset.role;
      switchDemoRole(role);
    });
  });

  // Brand click -> Return to default portal
  const brandLogo = document.getElementById('brandLogo');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => switchPortalView(state.currentRole));
  }

  // Notification bell toggle
  const btnNotif = document.getElementById('btnNotifications');
  const notifDropdown = document.getElementById('notificationsDropdown');
  if (btnNotif && notifDropdown) {
    btnNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => notifDropdown.classList.remove('show'));
  }

  // Mark all notifications read
  const btnMarkAll = document.getElementById('btnMarkAllRead');
  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', async () => {
      await apiRequest('/notifications/read-all', 'PUT');
      await fetchNotifications();
      showToast('All notifications marked as read', 'info');
    });
  }

  // Sub-tabs navigation across portals
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.portal-view');
      if (!container) return;
      container.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.dataset.target;
      container.querySelectorAll('.patient-sub-content, .doc-sub-content, .admin-sub-content').forEach(c => {
        c.style.display = 'none';
      });
      const target = document.getElementById(targetId);
      if (target) target.style.display = 'block';

      // Refresh specific tab data
      if (targetId === 'patientQueueTab') updatePatientQueueStatus();
      if (targetId === 'patientHistoryTab') loadPatientAppointments();
      if (targetId === 'docScheduleTab') loadDoctorSchedule();
      if (targetId === 'adminDoctorsTab') loadAdminDoctors();
      if (targetId === 'adminDepartmentsTab') loadAdminDepartments();
      if (targetId === 'adminAppointmentsTab') loadAdminAppointments();
    });
  });

  // Patient Doctor Search & Filters
  const searchInput = document.getElementById('doctorSearchInput');
  const deptSelect = document.getElementById('deptFilterSelect');
  const daySelect = document.getElementById('dayFilterSelect');

  if (searchInput) searchInput.addEventListener('input', debounce(loadDoctors, 300));
  if (deptSelect) deptSelect.addEventListener('change', loadDoctors);
  if (daySelect) daySelect.addEventListener('change', loadDoctors);

  // Booking Form Submission
  const bookingForm = document.getElementById('appointmentBookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', handleBookingSubmit);
  }

  // Payment Modal Buttons
  const btnSimulateScanPay = document.getElementById('btnSimulateScanPay');
  if (btnSimulateScanPay) btnSimulateScanPay.addEventListener('click', handleSimulateScanPay);

  const btnPayCounter = document.getElementById('btnPayCounter');
  if (btnPayCounter) btnPayCounter.addEventListener('click', handlePayCounter);

  const btnViewPassAfterPay = document.getElementById('btnViewDigitalPassAfterPay');
  if (btnViewPassAfterPay) {
    btnViewPassAfterPay.addEventListener('click', () => {
      closeModal('paymentModal');
      if (state.lastBookedAppt) {
        showDigitalPass(state.lastBookedAppt);
      }
    });
  }

  // Booking Date change -> load slots
  const bookingDate = document.getElementById('bookingDatePicker');
  if (bookingDate) {
    bookingDate.addEventListener('change', async (e) => {
      const docId = document.getElementById('bookingDoctorId').value;
      if (docId && e.target.value) {
        await loadDoctorSlots(docId, e.target.value);
      }
    });
  }

  // Doctor Queue Actions
  const btnCallNext = document.getElementById('btnCallNextToken');
  const btnCallNextEmpty = document.getElementById('btnCallNextTokenEmpty');
  const btnComplete = document.getElementById('btnCompleteConsult');

  if (btnCallNext) btnCallNext.addEventListener('click', handleDoctorAdvanceQueue);
  if (btnCallNextEmpty) btnCallNextEmpty.addEventListener('click', handleDoctorAdvanceQueue);
  if (btnComplete) btnComplete.addEventListener('click', handleDoctorCompleteConsult);

  // Reschedule Form
  const rescheduleForm = document.getElementById('rescheduleForm');
  if (rescheduleForm) {
    rescheduleForm.addEventListener('submit', handleRescheduleSubmit);
  }
  const rescheduleDate = document.getElementById('rescheduleDatePicker');
  if (rescheduleDate) {
    rescheduleDate.addEventListener('change', async (e) => {
      const docId = document.getElementById('rescheduleDocId').value;
      if (docId && e.target.value) {
        await loadRescheduleSlots(docId, e.target.value);
      }
    });
  }

  // Admin Add Doctor Form
  const addDocForm = document.getElementById('addDoctorForm');
  if (addDocForm) addDocForm.addEventListener('submit', handleAdminAddDoctor);

  const btnOpenAddDoc = document.getElementById('btnOpenAddDoctorModal');
  if (btnOpenAddDoc) btnOpenAddDoc.addEventListener('click', () => openModal('addDoctorModal'));

  // Admin Add Dept Form
  const addDeptForm = document.getElementById('addDeptForm');
  if (addDeptForm) addDeptForm.addEventListener('submit', handleAdminAddDept);

  const btnOpenAddDept = document.getElementById('btnOpenAddDeptModal');
  if (btnOpenAddDept) btnOpenAddDept.addEventListener('click', () => openModal('addDeptModal'));

  // Admin Search & Status filter
  const adminSearch = document.getElementById('adminApptSearch');
  const adminFilter = document.getElementById('adminApptStatusFilter');
  if (adminSearch) adminSearch.addEventListener('input', debounce(loadAdminAppointments, 300));
  if (adminFilter) adminFilter.addEventListener('change', loadAdminAppointments);

  // Admin Settings Form
  const adminSettingsForm = document.getElementById('adminSettingsForm');
  if (adminSettingsForm) {
    adminSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = {
        hospital_name: document.getElementById('setHospitalName').value,
        hospital_address: document.getElementById('setHospitalAddress').value,
        hospital_phone: document.getElementById('setHospitalPhone').value,
        hospital_emergency: document.getElementById('setEmergencyPhone').value,
        working_hours: document.getElementById('setWorkingHours').value
      };
      await apiRequest('/admin/settings', 'PUT', settings);
      showToast('Hospital settings successfully updated', 'success');
    });
  }
}

// Modal dismiss helpers
function setupModalDismissals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ====================================================================
// PATIENT PORTAL FUNCTIONS
// ====================================================================
async function loadPatientDashboard() {
  await updatePatientQueueStatus();
  await loadPatientAppointments();
}

async function loadDepartments() {
  try {
    const res = await apiRequest('/departments');
    if (res && res.success) {
      state.departments = res.departments;

      // Populate filter dropdowns
      const deptSelect = document.getElementById('deptFilterSelect');
      const newDocDept = document.getElementById('newDocDept');
      const authRegDept = document.getElementById('authRegDept');
      const deptChipsRow = document.getElementById('deptChipsRow');

      if (deptSelect) {
        deptSelect.innerHTML = '<option value="">All Departments</option>' +
          state.departments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('');
      }

      if (newDocDept) {
        newDocDept.innerHTML = state.departments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('');
      }

      if (authRegDept) {
        authRegDept.innerHTML = state.departments.map(d => `<option value="${d.department_id}">${d.department_name}</option>`).join('');
      }

      if (deptChipsRow) {
        deptChipsRow.innerHTML = '<button class="dept-chip active" data-dept="">All Specialties</button>' +
          state.departments.map(d => `<button class="dept-chip" data-dept="${d.department_id}">${d.department_name}</button>`).join('');

        deptChipsRow.querySelectorAll('.dept-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            deptChipsRow.querySelectorAll('.dept-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            if (deptSelect) deptSelect.value = chip.dataset.dept;
            loadDoctors();
          });
        });
      }
    }
  } catch (err) {
    console.error('Failed to load departments:', err);
  }
}

async function loadDoctors() {
  try {
    const search = document.getElementById('doctorSearchInput')?.value || '';
    const dept = document.getElementById('deptFilterSelect')?.value || '';
    const day = document.getElementById('dayFilterSelect')?.value || '';

    let url = `/doctors?search=${encodeURIComponent(search)}`;
    if (dept) url += `&departmentId=${encodeURIComponent(dept)}`;
    if (day) url += `&day=${encodeURIComponent(day)}`;

    const res = await apiRequest(url);
    if (res && res.success) {
      state.doctors = res.doctors;
      renderDoctorsGrid(res.doctors);
    }
  } catch (err) {
    console.error('Failed to load doctors:', err);
  }
}

function renderDoctorsGrid(doctors) {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;

  if (doctors.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #ffffff; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <p style="color: var(--text-muted); font-size: 1rem;">No doctors found matching your search criteria.</p>
      </div>`;
    return;
  }

  grid.innerHTML = doctors.map(doc => `
    <div class="doctor-card">
      <div class="doctor-card-top">
        <img class="doctor-avatar" src="${doc.avatar_url}" alt="${doc.name}" onerror="this.src='https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'">
        <div class="doctor-details-top">
          <h3>${doc.name}</h3>
          <div class="doctor-spec">${doc.specialization}</div>
          <div class="doctor-meta-badges">
            <span class="meta-badge">${doc.department_name}</span>
            <span class="meta-badge">${doc.experience_years} yrs exp</span>
            <span class="meta-badge rating">⭐ ${doc.rating}</span>
          </div>
        </div>
      </div>

      <ul class="doctor-info-list">
        <li>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${doc.qualification || 'MBBS, MD'}
        </li>
        <li>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Days: ${doc.available_days.slice(0, 4).join(', ')}${doc.available_days.length > 4 ? '...' : ''}
        </li>
        <li>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          ${doc.room_number}
        </li>
      </ul>

      <div class="doctor-card-footer">
        <div class="fee-tag">
          Consultation: <strong>₹${doc.consultation_fee}</strong>
        </div>
        <button class="btn btn-primary" onclick="openBookingModal('${doc.doctor_id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          Book Appointment
        </button>
      </div>
    </div>
  `).join('');
}

// Open Booking Modal for specific doctor
async function openBookingModal(doctorId) {
  const doc = state.doctors.find(d => d.doctor_id === doctorId);
  if (!doc) return;

  document.getElementById('bookingDoctorId').value = doc.doctor_id;
  document.getElementById('bookingDeptId').value = doc.department_id;
  document.getElementById('bookingDoctorName').textContent = doc.name;
  document.getElementById('bookingDoctorSpec').textContent = `${doc.specialization} &bull; ${doc.department_name}`;
  document.getElementById('bookingDoctorMeta').textContent = `${doc.room_number} &bull; ₹${doc.consultation_fee} Fee`;
  document.getElementById('bookingDoctorAvatar').src = doc.avatar_url;

  // Set date picker: minimum today, default today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('bookingDatePicker');
  dateInput.min = today;
  dateInput.value = today;

  document.getElementById('selectedSlotTime').value = '';
  document.getElementById('bookingReason').value = '';
  document.getElementById('bookingSymptoms').value = '';

  await loadDoctorSlots(doctorId, today);
  openModal('bookingModal');
}

// Load Slots for Doctor on given date
async function loadDoctorSlots(doctorId, dateString) {
  const container = document.getElementById('slotsGrid');
  const summary = document.getElementById('slotsCountSummary');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 12px;">Loading slots...</div>';
  if (summary) summary.textContent = 'Loading...';

  try {
    const res = await apiRequest(`/doctors/${doctorId}/slots?date=${dateString}`);
    if (res && res.success) {
      if (!res.isWorkingDay) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; background: #fee2e2; color: #991b1b; padding: 12px; border-radius: var(--radius-sm); font-size: 0.85rem; text-align: center;">
            Doctor is not scheduled on ${res.dayName}s. Please choose another date.
          </div>`;
        if (summary) summary.textContent = '0 slots';
        return;
      }

      if (summary) {
        summary.textContent = `${res.availableSlotsCount} available / ${res.slots.length} total`;
      }

      container.innerHTML = res.slots.map(s => `
        <div class="slot-chip ${s.isBooked ? 'booked' : ''}" 
             data-time="${s.time}" 
             title="${s.reason}"
             onclick="selectBookingSlot(this, '${s.time}', ${s.isBooked})">
          ${s.time}
        </div>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1 / -1; color: var(--danger);">Failed to load slots: ${err.message}</div>`;
  }
}

function selectBookingSlot(element, time, isBooked) {
  if (isBooked) {
    showToast('This time slot is already booked. Please choose an open slot.', 'warning');
    return;
  }
  document.querySelectorAll('#slotsGrid .slot-chip').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  document.getElementById('selectedSlotTime').value = time;
}

// Submit Booking Form -> Opens Payment & Dynamic QR Code Scanner
function handleBookingSubmit(e) {
  e.preventDefault();
  const doctor_id = document.getElementById('bookingDoctorId').value;
  const department_id = document.getElementById('bookingDeptId').value;
  const appointment_date = document.getElementById('bookingDatePicker').value;
  const appointment_time = document.getElementById('selectedSlotTime').value;
  const reason = document.getElementById('bookingReason').value;
  const symptoms = document.getElementById('bookingSymptoms').value;

  if (!appointment_time) {
    showToast('Please select an available time slot from the grid.', 'warning');
    return;
  }

  const doctor = state.doctors.find((d) => d.doctor_id === doctor_id) || {};
  const docFee = doctor.consultation_fee ? Number(doctor.consultation_fee) : 800;
  const totalAmount = docFee + 50; // Doctor fee + OPD registration

  state.pendingBooking = {
    doctor_id,
    department_id,
    appointment_date,
    appointment_time,
    reason,
    symptoms,
    doctor,
    docFee,
    totalAmount
  };

  openPaymentModal();
}

// Open Payment & UPI QR Code Scanner Modal
function openPaymentModal() {
  const p = state.pendingBooking;
  if (!p) return;

  const doc = p.doctor || {};
  document.getElementById('payDocName').textContent = doc.name || 'Specialist Doctor';
  document.getElementById('payDocDept').textContent = `${doc.specialization || 'OPD Specialist'} • ${doc.room_number || 'OPD'}`;
  document.getElementById('payDateTime').textContent = `${p.appointment_date} • ${p.appointment_time}`;
  document.getElementById('payDocFee').textContent = `₹${p.docFee}.00`;
  document.getElementById('payTotalAmount').textContent = `₹${p.totalAmount}.00`;

  // Reset Views
  const activeView = document.getElementById('paymentActiveView');
  const successView = document.getElementById('paymentSuccessView');
  if (activeView) activeView.style.display = 'block';
  if (successView) successView.style.display = 'none';

  const btnSim = document.getElementById('btnSimulateScanPay');
  if (btnSim) {
    btnSim.disabled = false;
    btnSim.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> I Have Scanned &amp; Paid (Simulate Approval)';
  }

  // Start 10-Minute Expiry Countdown
  startPaymentCountdown(10 * 60);

  closeModal('bookingModal');
  openModal('paymentModal');
}

function startPaymentCountdown(seconds) {
  if (state.paymentCountdownInterval) clearInterval(state.paymentCountdownInterval);
  let remaining = seconds;
  const display = document.getElementById('paymentCountdown');

  function tick() {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    if (display) {
      display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (remaining <= 0) {
      clearInterval(state.paymentCountdownInterval);
      showToast('Payment window expired. Please reselect your slot.', 'warning');
      closeModal('paymentModal');
    }
    remaining--;
  }

  tick();
  state.paymentCountdownInterval = setInterval(tick, 1000);
}

// Simulate Instant Scan & Approval
async function handleSimulateScanPay() {
  const p = state.pendingBooking;
  if (!p) {
    showToast('No booking in progress.', 'danger');
    return;
  }

  const btn = document.getElementById('btnSimulateScanPay');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="pulse-dot"></span> Verifying UPI Payment Gateway...';
  }

  // Realistic Gateway Verification Delay (1.2s)
  await new Promise((r) => setTimeout(r, 1200));

  const txnId = `TXN-UPI-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const res = await apiRequest('/appointments', 'POST', {
      doctor_id: p.doctor_id,
      department_id: p.department_id,
      appointment_date: p.appointment_date,
      appointment_time: p.appointment_time,
      reason: p.reason,
      symptoms: p.symptoms,
      payment_status: 'paid',
      payment_method: 'upi_qr',
      transaction_id: txnId,
      amount_paid: p.totalAmount
    });

    if (res && res.success) {
      if (state.paymentCountdownInterval) clearInterval(state.paymentCountdownInterval);

      state.lastBookedAppt = res.appointment;

      // Update Success View
      document.getElementById('paySuccessTxnId').textContent = txnId;
      document.getElementById('paySuccessAmount').textContent = `₹${p.totalAmount}.00`;
      document.getElementById('paySuccessMethod').textContent = 'UPI QR Scanner (mrecw.hospital@icici)';

      const activeView = document.getElementById('paymentActiveView');
      const successView = document.getElementById('paymentSuccessView');
      if (activeView) activeView.style.display = 'none';
      if (successView) successView.style.display = 'block';

      showToast('Payment Verified & Booking Confirmed! 🎉', 'success');

      await loadPatientAppointments();
      await updatePatientQueueStatus();
      await fetchNotifications();
    }
  } catch (err) {
    showToast('Payment booking failed: ' + err.message, 'danger');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> I Have Scanned &amp; Paid (Simulate Approval)';
    }
  }
}

// Pay Later at Reception Desk
async function handlePayCounter() {
  const p = state.pendingBooking;
  if (!p) return;

  const txnId = `COUNTER-OPD-${Date.now().toString(36).toUpperCase()}`;

  try {
    const res = await apiRequest('/appointments', 'POST', {
      doctor_id: p.doctor_id,
      department_id: p.department_id,
      appointment_date: p.appointment_date,
      appointment_time: p.appointment_time,
      reason: p.reason,
      symptoms: p.symptoms,
      payment_status: 'pending',
      payment_method: 'cash_at_counter',
      transaction_id: txnId,
      amount_paid: p.totalAmount
    });

    if (res && res.success) {
      if (state.paymentCountdownInterval) clearInterval(state.paymentCountdownInterval);
      closeModal('paymentModal');
      state.lastBookedAppt = res.appointment;

      showToast('Appointment reserved! Please pay at the OPD billing counter on arrival.', 'info');
      showDigitalPass(res.appointment);

      await loadPatientAppointments();
      await updatePatientQueueStatus();
      await fetchNotifications();
    }
  } catch (err) {
    showToast('Booking failed: ' + err.message, 'danger');
  }
}

// Show Digital Pass Modal with Verified Payment Badge
function showDigitalPass(appt) {
  if (!appt) return;
  document.getElementById('passTokenNum').textContent = `#${appt.token_number}`;
  document.getElementById('passRefCode').textContent = `REF: ${appt.booking_reference}`;
  document.getElementById('passPatientName').textContent = appt.patient_name || state.currentUser?.name || 'Patient';
  document.getElementById('passDateTime').textContent = `${appt.appointment_date} &bull; ${appt.appointment_time}`;
  document.getElementById('passDoctorName').textContent = appt.doctor_name || 'Specialist Doctor';
  document.getElementById('passRoom').textContent = `${appt.department_name} &bull; ${appt.doctor_room || 'OPD'}`;

  const statusPill = document.getElementById('passStatusPill');
  if (statusPill) {
    statusPill.className = `status-pill status-${appt.status}`;
    statusPill.textContent = appt.status.toUpperCase();
  }

  // Payment status badge & receipt
  const passPaymentStatus = document.getElementById('passPaymentStatus');
  const passTxnId = document.getElementById('passTxnId');
  if (passPaymentStatus) {
    if (appt.payment_status === 'paid') {
      passPaymentStatus.textContent = `PAID (₹${appt.amount_paid || 850}.00 via ${appt.payment_method?.toUpperCase() || 'UPI QR'})`;
      passPaymentStatus.style.color = '#15803d';
    } else {
      passPaymentStatus.textContent = `PAY ON ARRIVAL (₹${appt.amount_paid || 850}.00)`;
      passPaymentStatus.style.color = '#b45309';
    }
  }
  if (passTxnId) {
    passTxnId.textContent = appt.transaction_id ? `TXN: ${appt.transaction_id}` : `REF: ${appt.booking_reference}`;
  }

  openModal('passModal');
}

// Live Queue Tracker for Patient
async function updatePatientQueueStatus() {
  const card = document.getElementById('patientQueueCard');
  if (!card) return;

  try {
    const res = await apiRequest('/queue/patient/status');
    const tokenDisplay = document.getElementById('patientQueueToken');

    if (res && res.hasActiveTodayAppointment) {
      if (tokenDisplay) tokenDisplay.textContent = `#${res.myTokenNumber}`;

      document.getElementById('queueDoctorName').textContent = `${res.doctor.name} (${res.doctor.specialization})`;
      document.getElementById('queueRoomBadge').textContent = res.doctor.room_number;
      document.getElementById('queueNowServingToken').textContent = res.currentTokenServing > 0 ? `#${res.currentTokenServing}` : 'Ready';
      document.getElementById('queueMyToken').textContent = `#${res.myTokenNumber}`;
      document.getElementById('queueAheadCount').textContent = res.peopleAhead;
      document.getElementById('queueEstWait').textContent = `~${res.estimatedWaitMinutes} m`;

      const banner = document.getElementById('queueAlertBanner');
      const bannerText = document.getElementById('queueAlertText');

      card.classList.remove('approaching-border', 'now-serving-border');

      if (res.turnStatus === 'now_serving') {
        card.classList.add('now-serving-border');
        banner.className = 'queue-alert-banner success';
        bannerText.innerHTML = `<strong>Doctor Calling You Now! 🔔</strong> Please enter ${res.doctor.room_number} immediately.`;
      } else if (res.isTurnApproaching) {
        card.classList.add('approaching-border');
        banner.className = 'queue-alert-banner warning';
        bannerText.innerHTML = `<strong>Turn Approaching! ⏳</strong> Only ${res.peopleAhead} patient ahead of you. Please wait right outside ${res.doctor.room_number}.`;
      } else {
        banner.className = 'queue-alert-banner';
        bannerText.innerHTML = `<strong>Appointment Scheduled.</strong> ${res.peopleAhead} patients in queue ahead of you. Estimated wait: ~${res.estimatedWaitMinutes} mins.`;
      }
    } else {
      if (tokenDisplay) tokenDisplay.textContent = '#--';
      document.getElementById('queueNowServingToken').textContent = '#--';
      document.getElementById('queueMyToken').textContent = '#--';
      document.getElementById('queueAheadCount').textContent = '0';
      document.getElementById('queueEstWait').textContent = '0 m';

      const bannerText = document.getElementById('queueAlertText');
      if (bannerText) {
        bannerText.innerHTML = '<strong>No Active OPD Appointments Today.</strong> You can book a consultation slot from the doctor directory.';
      }
    }
  } catch (err) {
    console.warn('Queue status check error:', err.message);
  }
}

// Load Patient's Appointments History
async function loadPatientAppointments() {
  try {
    const res = await apiRequest('/appointments');
    if (res && res.success) {
      state.todayAppointments = res.appointments;

      const upcomingCount = res.appointments.filter(a => a.status === 'confirmed' || a.status === 'in_progress').length;
      const countEl = document.getElementById('patientUpcomingCount');
      if (countEl) countEl.textContent = upcomingCount;

      const badgeCount = document.getElementById('myAppointmentsCount');
      if (badgeCount) badgeCount.textContent = `${res.appointments.length} total visits`;

      renderAppointmentsList(res.appointments);
    }
  } catch (err) {
    console.error('Failed to load appointments:', err);
  }
}

function renderAppointmentsList(appointments) {
  const list = document.getElementById('patientAppointmentsList');
  if (!list) return;

  if (appointments.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 40px; background: #ffffff; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <p style="color: var(--text-muted);">You have no scheduled appointments. Browse doctors to book your first consultation.</p>
      </div>`;
    return;
  }

  list.innerHTML = appointments.map(apt => `
    <div class="appointment-card">
      <div class="appointment-info-left">
        <div class="token-badge-circle">
          <span class="num">#${apt.token_number}</span>
          <span class="tag">TOKEN</span>
        </div>
        <div class="appointment-details">
          <h4>${apt.doctor_name}</h4>
          <p>${apt.department_name} &bull; ${apt.doctor_room || 'OPD'}</p>
          <div class="appointment-meta-strip">
            <span>📅 <strong>${apt.appointment_date}</strong></span>
            <span>⏰ <strong>${apt.appointment_time}</strong></span>
            <span>Ref: <strong>${apt.booking_reference}</strong></span>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <span class="status-pill status-${apt.status}">${apt.status.replace('_', ' ').toUpperCase()}</span>
        <button class="btn btn-secondary btn-sm" onclick='showDigitalPass(${JSON.stringify(apt)})'>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Digital Pass
        </button>
        ${apt.status === 'confirmed' ? `
          <button class="btn btn-outline btn-sm" onclick="openRescheduleModal('${apt.appointment_id}', '${apt.doctor_id}')">Reschedule</button>
          <button class="btn btn-danger btn-sm" onclick="cancelAppointment('${apt.appointment_id}')">Cancel</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment? This slot will be opened for other patients.')) {
    return;
  }

  try {
    const res = await apiRequest(`/appointments/${appointmentId}/cancel`, 'PUT', { reason: 'Cancelled by patient' });
    if (res && res.success) {
      showToast('Appointment cancelled', 'warning');
      await loadPatientAppointments();
      await updatePatientQueueStatus();
      await fetchNotifications();
    }
  } catch (err) {
    showToast('Failed to cancel appointment: ' + err.message, 'danger');
  }
}

// Reschedule Modal
async function openRescheduleModal(apptId, docId) {
  document.getElementById('rescheduleApptId').value = apptId;
  document.getElementById('rescheduleDocId').value = docId;

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('rescheduleDatePicker');
  dateInput.min = today;
  dateInput.value = today;
  document.getElementById('rescheduleSelectedSlot').value = '';

  await loadRescheduleSlots(docId, today);
  openModal('rescheduleModal');
}

async function loadRescheduleSlots(docId, dateString) {
  const container = document.getElementById('rescheduleSlotsGrid');
  if (!container) return;
  container.innerHTML = 'Loading slots...';

  try {
    const res = await apiRequest(`/doctors/${docId}/slots?date=${dateString}`);
    if (res && res.success) {
      if (!res.isWorkingDay) {
        container.innerHTML = '<div style="color: var(--danger); font-size: 0.85rem;">Doctor off on this day.</div>';
        return;
      }
      container.innerHTML = res.slots.map(s => `
        <div class="slot-chip ${s.isBooked ? 'booked' : ''}" 
             data-time="${s.time}"
             onclick="selectRescheduleSlot(this, '${s.time}', ${s.isBooked})">
          ${s.time}
        </div>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = 'Error loading slots.';
  }
}

function selectRescheduleSlot(element, time, isBooked) {
  if (isBooked) {
    showToast('Slot already booked. Choose another.', 'warning');
    return;
  }
  document.querySelectorAll('#rescheduleSlotsGrid .slot-chip').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  document.getElementById('rescheduleSelectedSlot').value = time;
}

async function handleRescheduleSubmit(e) {
  e.preventDefault();
  const apptId = document.getElementById('rescheduleApptId').value;
  const newDate = document.getElementById('rescheduleDatePicker').value;
  const newTime = document.getElementById('rescheduleSelectedSlot').value;

  if (!newTime) {
    showToast('Please select a new time slot', 'warning');
    return;
  }

  try {
    const res = await apiRequest(`/appointments/${apptId}/reschedule`, 'PUT', {
      appointment_date: newDate,
      appointment_time: newTime
    });

    if (res && res.success) {
      closeModal('rescheduleModal');
      showToast('Appointment successfully rescheduled! 📅', 'success');
      await loadPatientAppointments();
      await fetchNotifications();
    }
  } catch (err) {
    showToast('Reschedule failed: ' + err.message, 'danger');
  }
}

// ====================================================================
// DOCTOR PORTAL FUNCTIONS
// ====================================================================
async function loadDoctorDashboard() {
  await refreshDoctorQueue();
  await loadDoctorSchedule();
}

async function refreshDoctorQueue() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await apiRequest(`/queue/doctor/${state.activeDoctorId}?date=${today}`);
    if (res && res.success) {
      // Update Doctor Hero
      const heroName = document.getElementById('doctorHeroName');
      const heroSub = document.getElementById('doctorHeroSub');
      if (heroName) heroName.textContent = `${res.doctor.name} 🩺`;
      if (heroSub) heroSub.textContent = `${res.doctor.specialization} &bull; ${res.doctor.room_number}`;

      // Update KPI counters
      document.getElementById('docStatsToday').textContent = res.totalBooked;
      document.getElementById('docStatsWaiting').textContent = res.totalWaiting;
      document.getElementById('docStatsCompleted').textContent = res.totalCompleted;
      document.getElementById('docQueueCountBadge').textContent = `${res.totalWaiting} waiting`;

      // Update Active Consultation card
      const activeAppt = res.queue.find(q => q.status === 'in_progress');
      const activeBox = document.getElementById('docActiveConsultContent');
      const emptyBox = document.getElementById('docNoActiveConsult');

      if (activeAppt) {
        activeBox.style.display = 'block';
        emptyBox.style.display = 'none';

        document.getElementById('docActiveToken').textContent = `#${activeAppt.token_number}`;
        document.getElementById('docActivePatientName').textContent = activeAppt.patient_name;
        document.getElementById('docActiveBookingRef').textContent = activeAppt.booking_reference;
        document.getElementById('docActiveReason').textContent = activeAppt.reason;
        document.getElementById('docActiveSymptoms').textContent = activeAppt.symptoms || 'None reported';
        document.getElementById('doctorNotesInput').value = activeAppt.doctor_notes || '';
      } else {
        activeBox.style.display = 'none';
        emptyBox.style.display = 'block';
      }

      // Render waiting queue list
      const waitingList = res.queue.filter(q => q.status === 'confirmed');
      const waitingContainer = document.getElementById('docWaitingQueueList');

      if (waitingContainer) {
        if (waitingList.length === 0) {
          waitingContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px;">No patients currently waiting in queue.</div>';
        } else {
          waitingContainer.innerHTML = waitingList.map(item => `
            <div style="background: var(--bg-alt); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 800; font-size: 1.1rem; color: var(--secondary);">#${item.token_number}</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: var(--dark);">${item.patient_name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${item.appointment_time} &bull; ${item.reason}</div>
                </div>
              </div>
              <span class="status-pill status-confirmed">WAITING</span>
            </div>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Doctor queue load error:', err);
  }
}

async function handleDoctorAdvanceQueue() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await apiRequest(`/queue/doctor/${state.activeDoctorId}/advance`, 'POST', { date: today });
    if (res && res.success) {
      showToast('Called next patient into consultation room! 🔔', 'success');
      await refreshDoctorQueue();
      await loadDoctorSchedule();
      await fetchNotifications();
    }
  } catch (err) {
    showToast('Failed to advance queue: ' + err.message, 'danger');
  }
}

async function handleDoctorCompleteConsult() {
  const today = new Date().toISOString().split('T')[0];
  const notes = document.getElementById('doctorNotesInput').value;

  try {
    // Find active appointment ID
    const queueData = await apiRequest(`/queue/doctor/${state.activeDoctorId}?date=${today}`);
    const activeAppt = queueData.queue.find(q => q.status === 'in_progress');

    if (!activeAppt) {
      showToast('No active consultation to complete.', 'warning');
      return;
    }

    await apiRequest(`/appointments/${activeAppt.appointment_id}/status`, 'PUT', {
      status: 'completed',
      doctor_notes: notes
    });

    showToast('Consultation completed and saved ✅', 'success');
    await refreshDoctorQueue();
    await loadDoctorSchedule();
    await fetchNotifications();
  } catch (err) {
    showToast('Error completing consultation: ' + err.message, 'danger');
  }
}

async function loadDoctorSchedule() {
  const tbody = document.getElementById('doctorAppointmentsTbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/appointments');
    if (res && res.success) {
      if (res.appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No scheduled appointments for today.</td></tr>';
        return;
      }

      tbody.innerHTML = res.appointments.map(apt => `
        <tr>
          <td><strong style="color: var(--secondary); font-size: 1rem;">#${apt.token_number}</strong></td>
          <td>${apt.appointment_time}</td>
          <td>
            <strong>${apt.patient_name}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${apt.patient_gender || 'Patient'}, ${apt.patient_blood_group || 'O+'}</div>
          </td>
          <td>${apt.patient_phone || 'N/A'}</td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-transform: ellipsis;" title="${apt.reason}">${apt.reason}</td>
          <td><span class="status-pill status-${apt.status}">${apt.status.replace('_', ' ')}</span></td>
          <td>
            ${apt.status === 'confirmed' ? `
              <button class="btn btn-primary btn-sm" onclick="setAppointmentStatus('${apt.appointment_id}', 'in_progress')">Call In</button>
            ` : apt.status === 'in_progress' ? `
              <button class="btn btn-success btn-sm" onclick="setAppointmentStatus('${apt.appointment_id}', 'completed')">Complete</button>
            ` : `
              <span style="font-size: 0.75rem; color: var(--text-light);">&mdash;</span>
            `}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load doctor schedule:', err);
  }
}

async function setAppointmentStatus(apptId, status) {
  try {
    await apiRequest(`/appointments/${apptId}/status`, 'PUT', { status });
    showToast(`Appointment marked as ${status}`, 'success');
    await refreshDoctorQueue();
    await loadDoctorSchedule();
    await fetchNotifications();
  } catch (err) {
    showToast('Status update failed: ' + err.message, 'danger');
  }
}

// ====================================================================
// ADMIN PORTAL FUNCTIONS
// ====================================================================
async function loadAdminDashboard() {
  await loadAdminStats();
  await loadAdminDoctors();
  await loadAdminDepartments();
  await loadAdminAppointments();
}

async function loadAdminStats() {
  try {
    const res = await apiRequest('/admin/stats');
    if (res && res.success) {
      const m = res.metrics;
      document.getElementById('adminKpiTotalDoctors').textContent = m.totalDoctors;
      document.getElementById('adminKpiTotalPatients').textContent = m.totalPatients;
      document.getElementById('adminKpiTotalAppts').textContent = m.totalAppointments;

      document.getElementById('statTodayBookings').textContent = m.todayAppointmentsCount;
      document.getElementById('statActiveQueue').textContent = m.activeConfirmedCount;
      document.getElementById('statCompleted').textContent = m.totalCompleted;
      document.getElementById('statDepartments').textContent = m.totalDepartments;

      // Department Load Bars
      const barsContainer = document.getElementById('deptLoadBars');
      if (barsContainer && res.departmentStats) {
        const maxVal = Math.max(...res.departmentStats.map(d => d.appointment_count), 1);
        barsContainer.innerHTML = res.departmentStats.map(d => {
          const pct = Math.round((d.appointment_count / maxVal) * 100);
          return `
            <div class="progress-item">
              <div class="progress-header">
                <span>${d.department_name}</span>
                <span><strong>${d.appointment_count}</strong> appointments (${pct}%)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

async function loadAdminDoctors() {
  const tbody = document.getElementById('adminDoctorsTbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/admin/doctors');
    if (res && res.success) {
      tbody.innerHTML = res.doctors.map(d => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${d.avatar_url}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
              <div>
                <strong>${d.name}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${d.email}</div>
              </div>
            </div>
          </td>
          <td>${d.department_name}</td>
          <td>${d.specialization}</td>
          <td>${d.experience_years} Years</td>
          <td><strong>₹${d.consultation_fee}</strong></td>
          <td>${d.room_number}</td>
          <td><span class="status-pill status-completed">ACTIVE</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading admin doctors:', err);
  }
}

async function handleAdminAddDoctor(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('newDocName').value,
    email: document.getElementById('newDocEmail').value,
    phone: document.getElementById('newDocPhone').value,
    department_id: document.getElementById('newDocDept').value,
    specialization: document.getElementById('newDocSpec').value,
    experience_years: document.getElementById('newDocExp').value,
    consultation_fee: document.getElementById('newDocFee').value,
    room_number: document.getElementById('newDocRoom').value
  };

  try {
    const res = await apiRequest('/doctors', 'POST', payload);
    if (res && res.success) {
      closeModal('addDoctorModal');
      showToast('Doctor profile created successfully! 🩺', 'success');
      await loadAdminDoctors();
      await loadDoctors();
    }
  } catch (err) {
    showToast('Failed to add doctor: ' + err.message, 'danger');
  }
}

async function loadAdminDepartments() {
  const tbody = document.getElementById('adminDeptTbody');
  if (!tbody) return;

  try {
    const res = await apiRequest('/departments');
    if (res && res.success) {
      tbody.innerHTML = res.departments.map(d => `
        <tr>
          <td><strong>${d.department_name}</strong></td>
          <td>${d.head_of_department || 'Dr. Specialist'}</td>
          <td style="max-width: 320px; font-size: 0.8rem; color: var(--text-muted);">${d.description}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="showToast('Department configuration updated', 'info')">Edit</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading admin depts:', err);
  }
}

async function handleAdminAddDept(e) {
  e.preventDefault();
  const payload = {
    department_name: document.getElementById('newDeptName').value,
    head_of_department: document.getElementById('newDeptHead').value,
    description: document.getElementById('newDeptDesc').value
  };

  try {
    const res = await apiRequest('/departments', 'POST', payload);
    if (res && res.success) {
      closeModal('addDeptModal');
      showToast('Department created successfully!', 'success');
      await loadDepartments();
      await loadAdminDepartments();
    }
  } catch (err) {
    showToast('Failed to add department: ' + err.message, 'danger');
  }
}

async function loadAdminAppointments() {
  const tbody = document.getElementById('adminAppointmentsTbody');
  if (!tbody) return;

  const search = document.getElementById('adminApptSearch')?.value || '';
  const status = document.getElementById('adminApptStatusFilter')?.value || 'all';

  try {
    const res = await apiRequest(`/appointments?search=${encodeURIComponent(search)}&status=${status}`);
    if (res && res.success) {
      if (res.appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No matching appointments found.</td></tr>';
        return;
      }

      tbody.innerHTML = res.appointments.map(apt => `
        <tr>
          <td><strong style="color: var(--primary);">${apt.booking_reference}</strong></td>
          <td>${apt.appointment_date} &bull; ${apt.appointment_time}</td>
          <td><span class="meta-badge">Token #${apt.token_number}</span></td>
          <td><strong>${apt.patient_name}</strong></td>
          <td>${apt.doctor_name}</td>
          <td>${apt.department_name}</td>
          <td><span class="status-pill status-${apt.status}">${apt.status.replace('_', ' ')}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading admin appointments:', err);
  }
}

// ====================================================================
// NOTIFICATIONS SYSTEM
// ====================================================================
async function fetchNotifications() {
  if (!state.token) return;
  try {
    const res = await apiRequest('/notifications');
    if (res && res.success) {
      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.textContent = res.unreadCount;
        badge.style.display = res.unreadCount > 0 ? 'flex' : 'none';
      }

      const list = document.getElementById('notificationList');
      if (list) {
        if (res.notifications.length === 0) {
          list.innerHTML = '<li class="notification-item" style="color: var(--text-muted); text-align: center;">No notifications.</li>';
          return;
        }

        list.innerHTML = res.notifications.slice(0, 15).map(n => `
          <li class="notification-item ${!n.read_status ? 'unread' : ''}" onclick="markNotifAsRead('${n.notification_id}')">
            <div class="title">
              <span>${n.title}</span>
              ${!n.read_status ? '<span style="color: var(--primary); font-size: 0.65rem;">● NEW</span>' : ''}
            </div>
            <div class="body">${n.message}</div>
            <div class="time">${formatRelativeTime(n.created_at)}</div>
          </li>
        `).join('');
      }
    }
  } catch (err) {
    console.warn('Fetch notifications error:', err.message);
  }
}

async function markNotifAsRead(notifId) {
  try {
    await apiRequest(`/notifications/${notifId}/read`, 'PUT');
    await fetchNotifications();
  } catch (err) {
    console.warn('Mark read error:', err.message);
  }
}

// ====================================================================
// UTILITIES & HELPERS
// ====================================================================
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API Request Failed');
  }

  return data;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const diffSec = Math.floor((new Date() - date) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

