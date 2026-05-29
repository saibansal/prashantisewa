const API_BASE_URL = 'http://localhost:5000/api';

// State Management
let currentToken = localStorage.getItem('token') || null;
let currentAdmin = JSON.parse(localStorage.getItem('admin')) || null;
let activeTab = 'usersSection';
let allUsers = [];
let allDutyPoints = [];
let allAssignments = [];

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardLayout = document.getElementById('dashboardLayout');
const loginForm = document.getElementById('loginForm');
const loginIdInput = document.getElementById('loginId');
const loginPasswordInput = document.getElementById('loginPassword');

const welcomeMessage = document.getElementById('welcomeMessage');
const adminUsername = document.getElementById('adminUsername');
const adminAvatar = document.getElementById('adminAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarItems = document.querySelectorAll('.sidebar-item[data-target]');
const sectionContainers = document.querySelectorAll('.section-container');

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  // Slide out and remove
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Check Authentication status
async function checkAuth() {
  if (!currentToken) {
    showLogin();
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      showDashboard(data.admin);
    } else {
      localStorage.clear();
      showLogin();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    // Offline / Backend not available: allow session for local UI demo but show warning
    showToast('Could not verify session with server. Running offline mode.', 'error');
    showDashboard(currentAdmin || { loginId: 'admin' });
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  dashboardLayout.style.display = 'none';
  localStorage.clear();
  currentToken = null;
  currentAdmin = null;
}

function showDashboard(admin) {
  currentAdmin = admin;
  localStorage.setItem('admin', JSON.stringify(admin));
  loginScreen.style.display = 'none';
  dashboardLayout.style.display = 'flex';
  
  welcomeMessage.textContent = `Welcome back, ${admin.loginId}`;
  adminUsername.textContent = admin.loginId;
  adminAvatar.textContent = admin.loginId.substring(0, 2).toUpperCase();

  // Fetch dashboard data
  fetchUsers();
  fetchDutyPoints();
  fetchAssignments();
  
  // Refresh Lucide Icons
  lucide.createIcons();
}

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loginId = loginIdInput.value.trim();
  const password = loginPasswordInput.value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password })
    });
    const data = await res.json();

    if (res.ok) {
      currentToken = data.token;
      localStorage.setItem('token', data.token);
      showToast('Login Successful!', 'success');
      showDashboard(data.admin);
      loginForm.reset();
    } else {
      showToast(data.error || 'Invalid credentials', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to the backend server', 'error');
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  showLogin();
  showToast('Logged out successfully', 'success');
});

// Sidebar Tab Routing
sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    // UI update
    sidebarItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // Section switch
    const target = item.getAttribute('data-target');
    activeTab = target;
    sectionContainers.forEach(container => {
      container.classList.remove('active');
      if (container.id === target) {
        container.classList.add('active');
      }
    });

    // Refresh view data
    if (target === 'usersSection') fetchUsers();
    else if (target === 'dutyPointsSection') fetchDutyPoints();
    else if (target === 'assignmentsSection') {
      fetchUsers();
      fetchDutyPoints();
      fetchAssignments();
    }
  });
});

// ================= USERS SECTION LOGIC =================
const userGrid = document.getElementById('userGrid');
const openAddUserModal = document.getElementById('openAddUserModal');
const closeAddUserModal = document.getElementById('closeAddUserModal');
const addUserModal = document.getElementById('addUserModal');
const cancelAddUser = document.getElementById('cancelAddUser');
const addUserForm = document.getElementById('addUserForm');
const userPhotoFile = document.getElementById('userPhotoFile');
const userPhotoPreview = document.getElementById('userPhotoPreview');
const userSearchInput = document.getElementById('userSearchInput');

// Open/Close Modal
openAddUserModal.addEventListener('click', () => {
  addUserModal.classList.add('active');
});
const closeModal = () => {
  addUserModal.classList.remove('active');
  addUserForm.reset();
  userPhotoPreview.style.display = 'none';
  userPhotoPreview.src = '#';
};
closeAddUserModal.addEventListener('click', closeModal);
cancelAddUser.addEventListener('click', closeModal);

// Photo Preview
userPhotoFile.addEventListener('change', function() {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      userPhotoPreview.src = e.target.result;
      userPhotoPreview.style.display = 'block';
    }
    reader.readAsDataURL(file);
  }
});

// Fetch Users
async function fetchUsers() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      allUsers = await res.json();
      renderUsers(allUsers);
      populateAssignUsersDropdown(allUsers);
    }
  } catch (error) {
    console.error('Fetch users error:', error);
  }
}

// Render Users Grid
function renderUsers(users) {
  userGrid.innerHTML = '';
  if (users.length === 0) {
    userGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>No registered users found.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  users.forEach(user => {
    const userCard = document.createElement('div');
    userCard.className = 'user-card';
    
    // Check if photo_url exists
    let avatarHTML = '';
    if (user.photo_url) {
      avatarHTML = `<img src="${API_BASE_URL.replace('/api', '')}${user.photo_url}" class="user-photo" alt="${user.full_name}">`;
    } else {
      const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarHTML = `<div class="user-placeholder-avatar">${initials}</div>`;
    }

    // Format DOB and Joining Dates
    const dobFormatted = new Date(user.date_of_birth).toLocaleDateString();
    const joinFormatted = new Date(user.joining_date).toLocaleDateString();

    userCard.innerHTML = `
      ${avatarHTML}
      <h3 class="user-name">${user.full_name}</h3>
      <span class="user-id-badge">${user.sai_connect_id}</span>
      <div class="user-meta-info">
        <div class="user-meta-item">
          <span class="user-meta-label">Location</span>
          <span>${user.city}, ${user.state}</span>
        </div>
        <div class="user-meta-item">
          <span class="user-meta-label">DOB</span>
          <span>${dobFormatted}</span>
        </div>
        <div class="user-meta-item">
          <span class="user-meta-label">Joined</span>
          <span>${joinFormatted}</span>
        </div>
        <div class="user-meta-item">
          <span class="user-meta-label">Zipcode</span>
          <span>${user.zipcode}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="btn btn-danger btn-block" onclick="deleteUser('${user.id}')">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          <span>Delete User</span>
        </button>
      </div>
    `;
    userGrid.appendChild(userCard);
  });
  lucide.createIcons();
}

// User Search Filtering
userSearchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allUsers.filter(u => 
    u.full_name.toLowerCase().includes(query) ||
    u.sai_connect_id.toLowerCase().includes(query) ||
    u.city.toLowerCase().includes(query) ||
    u.state.toLowerCase().includes(query)
  );
  renderUsers(filtered);
});

// Delete User
async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user? All associated duty assignments will be removed.')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast('User profile deleted', 'success');
      fetchUsers();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete user', 'error');
    }
  } catch (error) {
    showToast('Connection error during deletion', 'error');
  }
}

// Add User Form Submission
addUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('fullName', document.getElementById('userFullName').value.trim());
  formData.append('saiConnectId', document.getElementById('userSaiConnectId').value.trim());
  formData.append('state', document.getElementById('userState').value.trim());
  formData.append('district', document.getElementById('userDistrict').value.trim());
  formData.append('city', document.getElementById('userCity').value.trim());
  formData.append('zipcode', document.getElementById('userZipcode').value.trim());
  formData.append('dateOfBirth', document.getElementById('userDob').value);
  formData.append('joiningDate', document.getElementById('userJoiningDate').value);

  const fileInput = document.getElementById('userPhotoFile');
  if (fileInput.files[0]) {
    formData.append('photo', fileInput.files[0]);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
      body: formData // Note: Content-Type is auto-configured for Multipart boundary by fetch
    });
    const data = await res.json();

    if (res.ok) {
      showToast('User profile registered successfully!', 'success');
      closeModal();
      fetchUsers();
    } else {
      showToast(data.error || 'Error registering user', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to the backend server', 'error');
  }
});


// ================= DUTY POINTS SECTION LOGIC =================
const dutyGrid = document.getElementById('dutyGrid');
const addDutyPointForm = document.getElementById('addDutyPointForm');
const subPointsList = document.getElementById('subPointsList');
const addSubPointInputBtn = document.getElementById('addSubPointInputBtn');

// Add Sub Point Row Input helper
addSubPointInputBtn.addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'sub-point-input-row';
  row.innerHTML = `
    <input type="text" class="sub-point-input" placeholder="e.g. Exit Gate" required>
    <button type="button" class="btn btn-danger remove-subpoint-btn" style="padding: 10px;">
      <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
    </button>
  `;
  subPointsList.appendChild(row);
  lucide.createIcons();

  // Add click listener to the delete button in the new row
  row.querySelector('.remove-subpoint-btn').addEventListener('click', () => {
    row.remove();
  });
});

// Fetch Duty Points
async function fetchDutyPoints() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/duty-points`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      allDutyPoints = await res.json();
      renderDutyPoints(allDutyPoints);
      populateDutyPointsDropdown(allDutyPoints);
    }
  } catch (error) {
    console.error('Fetch duty points error:', error);
  }
}

// Render Duty Points list
function renderDutyPoints(points) {
  dutyGrid.innerHTML = '';
  if (points.length === 0) {
    dutyGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="map-pin" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>No duty points configured yet.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  points.forEach(point => {
    const card = document.createElement('div');
    card.className = 'duty-card';

    const subbadges = point.sub_points.map(sp => `<span class="subpoint-badge">${sp}</span>`).join('');

    card.innerHTML = `
      <div class="duty-card-header">
        <div>
          <span style="font-size:0.75rem; text-transform:uppercase; color: var(--text-muted); font-weight:600;">Main Point</span>
          <h4 class="duty-main-point">${point.main_point}</h4>
        </div>
        <button class="btn btn-danger" style="padding: 6px 10px;" onclick="deleteDutyPoint('${point.id}')">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
      <span style="font-size:0.75rem; text-transform:uppercase; color: var(--text-muted); font-weight:600; display:block; margin-top: 14px;">Sub Points (${point.sub_points.length})</span>
      <div class="subpoints-container">
        ${subbadges}
      </div>
    `;
    dutyGrid.appendChild(card);
  });
  lucide.createIcons();
}

// Delete Duty Point
async function deleteDutyPoint(id) {
  if (!confirm('Are you sure you want to delete this duty point? All associated staff allocations will be deleted.')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/duty-points/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast('Duty point deleted successfully', 'success');
      fetchDutyPoints();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete duty point', 'error');
    }
  } catch (error) {
    showToast('Connection error during deletion', 'error');
  }
}

// Save Duty Point Form Submit
addDutyPointForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const mainPoint = document.getElementById('mainPoint').value.trim();
  const inputs = document.querySelectorAll('.sub-point-input');
  
  const subPoints = [];
  inputs.forEach(input => {
    if (input.value.trim().length > 0) {
      subPoints.push(input.value.trim());
    }
  });

  try {
    const res = await fetch(`${API_BASE_URL}/duty-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ mainPoint, subPoints })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('Duty Point created!', 'success');
      addDutyPointForm.reset();
      // Keep only one subpoint input row
      subPointsList.innerHTML = `
        <div class="sub-point-input-row">
          <input type="text" class="sub-point-input" placeholder="e.g. Entry Turnstile" required>
          <button type="button" class="btn btn-danger remove-subpoint-btn" style="padding: 10px;" disabled>
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
      fetchDutyPoints();
    } else {
      showToast(data.error || 'Failed to create duty point', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to the backend server', 'error');
  }
});


// ================= ASSIGNMENT SECTION LOGIC =================
const assignUserSelect = document.getElementById('assignUserSelect');
const assignDutyPointSelect = document.getElementById('assignDutyPointSelect');
const assignSubPointSelect = document.getElementById('assignSubPointSelect');
const assignUserForm = document.getElementById('assignUserForm');
const assignmentsTableBody = document.getElementById('assignmentsTableBody');
const assignmentSearchInput = document.getElementById('assignmentSearchInput');

// Populate Users select dropdown
function populateAssignUsersDropdown(users) {
  assignUserSelect.innerHTML = '<option value="" disabled selected>-- Choose User --</option>';
  users.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user.id;
    opt.textContent = `${user.full_name} (${user.sai_connect_id})`;
    assignUserSelect.appendChild(opt);
  });
}

// Populate Duty Points select dropdown
function populateDutyPointsDropdown(points) {
  assignDutyPointSelect.innerHTML = '<option value="" disabled selected>-- Choose Duty Point --</option>';
  points.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.main_point;
    assignDutyPointSelect.appendChild(opt);
  });
  
  // Reset Sub Point select
  assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
  assignSubPointSelect.disabled = true;
}

// Handle change in Main Duty Point dropdown selection
assignDutyPointSelect.addEventListener('change', function() {
  const pointId = this.value;
  const selectedPoint = allDutyPoints.find(p => p.id === pointId);

  if (selectedPoint && selectedPoint.sub_points.length > 0) {
    assignSubPointSelect.disabled = false;
    assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Choose Sub Point --</option>';
    selectedPoint.sub_points.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      assignSubPointSelect.appendChild(opt);
    });
  } else {
    assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- No Sub-points configured --</option>';
    assignSubPointSelect.disabled = true;
  }
});

// Fetch Assignments
async function fetchAssignments() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/assignments`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      allAssignments = await res.json();
      renderAssignments(allAssignments);
    }
  } catch (error) {
    console.error('Fetch assignments error:', error);
  }
}

// Render Assignments
function renderAssignments(assignments) {
  assignmentsTableBody.innerHTML = '';
  if (assignments.length === 0) {
    assignmentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
          No active duty assignments.
        </td>
      </tr>
    `;
    return;
  }

  assignments.forEach(assign => {
    const row = document.createElement('tr');
    
    // Check if user or duty_point models failed to join due to manual database tweaks
    const userName = assign.user ? assign.user.full_name : 'Unknown User';
    const userSaiId = assign.user ? assign.user.sai_connect_id : 'N/A';
    const userCity = assign.user ? `${assign.user.city}, ${assign.user.state}` : 'N/A';
    const mainPoint = assign.duty_point ? assign.duty_point.main_point : 'Unknown Point';
    const assignedDate = new Date(assign.assigned_at).toLocaleDateString() + ' ' + new Date(assign.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <td>
        <div class="assignment-user">
          <div>
            <div class="assignment-user-name">${userName}</div>
            <div class="assignment-user-sub">${userCity}</div>
          </div>
        </div>
      </td>
      <td>${userSaiId}</td>
      <td>
        <div style="font-weight: 500; color: var(--text-primary);">${mainPoint}</div>
      </td>
      <td>
        <span class="badge-subpoint">${assign.assigned_sub_point}</span>
      </td>
      <td style="font-size: 0.85rem;">${assignedDate}</td>
      <td>
        <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="removeAssignment('${assign.id}')">
          <span>Unassign</span>
        </button>
      </td>
    `;
    assignmentsTableBody.appendChild(row);
  });
}

// Remove Assignment
async function removeAssignment(id) {
  if (!confirm('Are you sure you want to end this duty allocation?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast('Assignment ended', 'success');
      fetchAssignments();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to remove assignment', 'error');
    }
  } catch (error) {
    showToast('Connection error during deletion', 'error');
  }
}

// Form assignment submission
assignUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = assignUserSelect.value;
  const dutyPointId = assignDutyPointSelect.value;
  const assignedSubPoint = assignSubPointSelect.value;

  try {
    const res = await fetch(`${API_BASE_URL}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ userId, dutyPointId, assignedSubPoint })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('Staff successfully assigned to duty!', 'success');
      assignUserForm.reset();
      assignSubPointSelect.disabled = true;
      assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
      fetchAssignments();
    } else {
      showToast(data.error || 'Failed to allocate staff', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to the backend server', 'error');
  }
});

// Filter Assignments Table Search
assignmentSearchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allAssignments.filter(assign => {
    const name = assign.user ? assign.user.full_name.toLowerCase() : '';
    const saiId = assign.user ? assign.user.sai_connect_id.toLowerCase() : '';
    const main = assign.duty_point ? assign.duty_point.main_point.toLowerCase() : '';
    const sub = assign.assigned_sub_point.toLowerCase();
    
    return name.includes(query) || saiId.includes(query) || main.includes(query) || sub.includes(query);
  });
  renderAssignments(filtered);
});


// ================= REGISTER ADMIN LOGIC =================
const registerAdminForm = document.getElementById('registerAdminForm');
const newAdminLoginIdInput = document.getElementById('newAdminLoginId');
const newAdminPasswordInput = document.getElementById('newAdminPassword');

registerAdminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loginId = newAdminLoginIdInput.value.trim();
  const password = newAdminPasswordInput.value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ loginId, password })
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`Admin account "${loginId}" registered!`, 'success');
      registerAdminForm.reset();
    } else {
      showToast(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to the backend server', 'error');
  }
});


// APP INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Verify token
  checkAuth();
});
