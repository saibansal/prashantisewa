// Set API URL dynamically to the host origin with fallback for local file access
const API_BASE_URL = (window.location.origin && window.location.origin.startsWith('http'))
  ? window.location.origin + '/api'
  : 'http://localhost:5000/api';

// State Management
let currentToken = 'direct-access-token';
let currentAdmin = { loginId: 'admin' };
let activeTab = 'usersSection';
let allUsers = [];
let allDutyPoints = [];
let allAssignments = [];
let editingUserId = null;
let editingDutyPointId = null;

// Sewa State Management
let currentSewaState = null;
let currentSewaStartDate = null;
let currentSewaEndDate = null;
let sewaSelectedDistricts = [];
let sewaSelectedCities = [];
let allSewaPeriods = [];
let activeSewaState = null;
let activeSewaStartDate = null;
let activeSewaEndDate = null;

// Reusable Modular Location Component
class LocationSelector {
  constructor(options) {
    this.container = options.container;
    this.multiSelect = options.multiSelect || false;
    this.onStateChange = options.onStateChange || null;
    this.onDistrictChange = options.onDistrictChange || null;
    this.onCityChange = options.onCityChange || null;
    
    this.selectedState = "";
    this.selectedDistricts = [];
    this.selectedCities = [];
    this.customCityValue = "";
    
    this.init();
  }
  
  init() {
    if (!this.container) return;
    this.container.innerHTML = "";
    
    if (this.multiSelect) {
      this.renderMultiSelect();
    } else {
      this.renderStandardSelect();
    }
    
    this.populateStates();
    this.bindEvents();
  }
  
  renderStandardSelect() {
    this.container.innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label>State</label>
          <select class="location-state-select" required>
            <option value="" disabled selected>-- Select State --</option>
          </select>
        </div>
        <div class="form-group">
          <label>District</label>
          <select class="location-district-select" required disabled>
            <option value="" disabled selected>-- Select State First --</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>City</label>
          <select class="location-city-select" required disabled>
            <option value="" disabled selected>-- Select District First --</option>
          </select>
          <input type="text" class="location-custom-city-input" placeholder="Type Custom City/Town Name" style="margin-top: 10px; display: none;" />
        </div>
      </div>
    `;
    
    this.stateSelect = this.container.querySelector('.location-state-select');
    this.districtSelect = this.container.querySelector('.location-district-select');
    this.citySelect = this.container.querySelector('.location-city-select');
    this.customCityInput = this.container.querySelector('.location-custom-city-input');
  }
  
  renderMultiSelect() {
    this.container.innerHTML = `
      <div class="form-group location-state-group" id="assignmentStateFilterGroup">
        <label>3. Filter by State</label>
        <select class="location-state-select">
          <option value="" selected>-- Choose State --</option>
        </select>
      </div>
      <div class="form-group">
        <label>4. Filter by District(s)</label>
        <div class="multiselect-container">
          <div class="multiselect-selectBox location-district-toggle">
            <div class="multiselect-selected-text location-district-text">-- Choose District(s) --</div>
            <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="multiselect-dropdown location-district-dropdown"></div>
        </div>
      </div>
      <div class="form-group">
        <label>5. Filter by City/Cities</label>
        <div class="multiselect-container">
          <div class="multiselect-selectBox location-city-toggle">
            <div class="multiselect-selected-text location-city-text">-- Choose City/Cities --</div>
            <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
          </div>
          <div class="multiselect-dropdown location-city-dropdown"></div>
        </div>
      </div>
    `;
    
    this.stateSelect = this.container.querySelector('.location-state-select');
    this.districtToggle = this.container.querySelector('.location-district-toggle');
    this.districtDropdown = this.container.querySelector('.location-district-dropdown');
    this.districtText = this.container.querySelector('.location-district-text');
    
    this.cityToggle = this.container.querySelector('.location-city-toggle');
    this.cityDropdown = this.container.querySelector('.location-city-dropdown');
    this.cityText = this.container.querySelector('.location-city-text');
    
    this.districtToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.districtDropdown.classList.toggle('active');
      this.cityDropdown.classList.remove('active');
    });
    
    this.cityToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cityDropdown.classList.toggle('active');
      this.districtDropdown.classList.remove('active');
    });
    
    document.addEventListener('click', () => {
      this.districtDropdown.classList.remove('active');
      this.cityDropdown.classList.remove('active');
    });
    
    this.districtDropdown.addEventListener('click', (e) => e.stopPropagation());
    this.cityDropdown.addEventListener('click', (e) => e.stopPropagation());
  }
  
  populateStates() {
    Object.keys(locationData).forEach(state => {
      const opt = document.createElement('option');
      opt.value = state;
      opt.textContent = state;
      this.stateSelect.appendChild(opt);
    });
  }
  
  bindEvents() {
    if (this.multiSelect) {
      this.stateSelect.addEventListener('change', () => {
        this.selectedState = this.stateSelect.value;
        this.selectedDistricts = [];
        this.selectedCities = [];
        this.districtText.textContent = '-- Choose District(s) --';
        this.cityText.textContent = '-- Choose City/Cities --';
        this.districtDropdown.innerHTML = '';
        this.cityDropdown.innerHTML = '';
        
        this.populateDistrictsMulti();
        
        if (this.onStateChange) this.onStateChange(this.selectedState);
      });
    } else {
      this.stateSelect.addEventListener('change', () => {
        this.selectedState = this.stateSelect.value;
        this.districtSelect.disabled = false;
        this.districtSelect.innerHTML = '<option value="" disabled selected>-- Select District --</option>';
        this.citySelect.disabled = true;
        this.citySelect.innerHTML = '<option value="" disabled selected>-- Select District First --</option>';
        this.customCityInput.style.display = 'none';
        this.customCityInput.value = '';
        this.customCityInput.required = false;
        
        if (locationData[this.selectedState]) {
          Object.keys(locationData[this.selectedState]).forEach(district => {
            const opt = document.createElement('option');
            opt.value = district;
            opt.textContent = district;
            this.districtSelect.appendChild(opt);
          });
        }
        
        if (this.onStateChange) this.onStateChange(this.selectedState);
      });
      
      this.districtSelect.addEventListener('change', () => {
        const selectedDistrict = this.districtSelect.value;
        this.citySelect.disabled = false;
        this.citySelect.innerHTML = '<option value="" disabled selected>-- Select City --</option>';
        this.customCityInput.style.display = 'none';
        this.customCityInput.value = '';
        this.customCityInput.required = false;
        
        if (locationData[this.selectedState] && locationData[this.selectedState][selectedDistrict]) {
          locationData[this.selectedState][selectedDistrict].forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            this.citySelect.appendChild(opt);
          });
          
          const customOpt = document.createElement('option');
          customOpt.value = 'CUSTOM';
          customOpt.textContent = '+ Add Custom City';
          this.citySelect.appendChild(customOpt);
        }
        
        if (this.onDistrictChange) this.onDistrictChange([selectedDistrict]);
      });
      
      this.citySelect.addEventListener('change', () => {
        if (this.citySelect.value === 'CUSTOM') {
          this.customCityInput.style.display = 'block';
          this.customCityInput.required = true;
          this.customCityInput.focus();
        } else {
          this.customCityInput.style.display = 'none';
          this.customCityInput.required = false;
          this.customCityInput.value = '';
        }
        
        if (this.onCityChange) this.onCityChange([this.getCityValue()]);
      });
      
      this.customCityInput.addEventListener('input', () => {
        if (this.onCityChange) this.onCityChange([this.getCityValue()]);
      });
    }
  }
  
  populateDistrictsMulti() {
    this.districtDropdown.innerHTML = '';
    
    if (!this.selectedState) {
      this.districtDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">Select state first</div>';
      this.populateCitiesMulti();
      return;
    }
    
    const uniqueDistricts = (locationData[this.selectedState] ? Object.keys(locationData[this.selectedState]) : []).sort();
    
    if (uniqueDistricts.length === 0) {
      this.districtDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">No districts found</div>';
      this.populateCitiesMulti();
      return;
    }
    
    uniqueDistricts.forEach(district => {
      const option = document.createElement('div');
      option.className = 'multiselect-option';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = district;
      checkbox.id = `comp_dist_${district.replace(/\s+/g, '_')}`;
      
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = district;
      label.style.cursor = 'pointer';
      label.style.flexGrow = '1';
      
      option.appendChild(checkbox);
      option.appendChild(label);
      this.districtDropdown.appendChild(option);
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedDistricts.push(district);
        } else {
          this.selectedDistricts = this.selectedDistricts.filter(d => d !== district);
        }
        
        if (this.selectedDistricts.length === 0) {
          this.districtText.textContent = '-- Choose District(s) --';
        } else if (this.selectedDistricts.length <= 2) {
          this.districtText.textContent = this.selectedDistricts.join(', ');
        } else {
          this.districtText.textContent = `${this.selectedDistricts.length} Districts Selected`;
        }
        
        this.populateCitiesMulti();
        if (this.onDistrictChange) this.onDistrictChange(this.selectedDistricts);
      });
    });
    
    lucide.createIcons();
  }
  
  populateCitiesMulti() {
    this.cityDropdown.innerHTML = '';
    this.selectedCities = [];
    this.cityText.textContent = '-- Choose City/Cities --';
    
    if (!this.selectedState || this.selectedDistricts.length === 0) {
      this.cityDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">Select district first</div>';
      if (this.onCityChange) this.onCityChange([]);
      return;
    }
    
    let uniqueCities = [];
    this.selectedDistricts.forEach(dist => {
      if (locationData[this.selectedState] && locationData[this.selectedState][dist]) {
        uniqueCities = uniqueCities.concat(locationData[this.selectedState][dist]);
      }
    });
    uniqueCities = [...new Set(uniqueCities)].sort();
    
    if (uniqueCities.length === 0) {
      this.cityDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">No cities found</div>';
      if (this.onCityChange) this.onCityChange([]);
      return;
    }
    
    uniqueCities.forEach(city => {
      const option = document.createElement('div');
      option.className = 'multiselect-option';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = city;
      checkbox.id = `comp_city_${city.replace(/\s+/g, '_')}`;
      
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = city;
      label.style.cursor = 'pointer';
      label.style.flexGrow = '1';
      
      option.appendChild(checkbox);
      option.appendChild(label);
      this.cityDropdown.appendChild(option);
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.selectedCities.push(city);
        } else {
          this.selectedCities = this.selectedCities.filter(c => c !== city);
        }
        
        if (this.selectedCities.length === 0) {
          this.cityText.textContent = '-- Choose City/Cities --';
        } else if (this.selectedCities.length <= 2) {
          this.cityText.textContent = this.selectedCities.join(', ');
        } else {
          this.cityText.textContent = `${this.selectedCities.length} Cities Selected`;
        }
        
        if (this.onCityChange) this.onCityChange(this.selectedCities);
      });
    });
    
    lucide.createIcons();
  }
  
  getCityValue() {
    if (this.multiSelect) {
      return this.selectedCities;
    }
    return this.citySelect.value === 'CUSTOM' ? this.customCityInput.value.trim() : this.citySelect.value;
  }
  
  reset() {
    this.selectedState = "";
    this.selectedDistricts = [];
    this.selectedCities = [];
    if (this.stateSelect) this.stateSelect.value = "";
    
    if (this.multiSelect) {
      if (this.districtText) this.districtText.textContent = '-- Choose District(s) --';
      if (this.cityText) this.cityText.textContent = '-- Choose City/Cities --';
      if (this.districtDropdown) this.districtDropdown.innerHTML = '';
      if (this.cityDropdown) this.cityDropdown.innerHTML = '';
    } else {
      if (this.districtSelect) {
        this.districtSelect.innerHTML = '<option value="" disabled selected>-- Select State First --</option>';
        this.districtSelect.disabled = true;
      }
      if (this.citySelect) {
        this.citySelect.innerHTML = '<option value="" disabled selected>-- Select District First --</option>';
        this.citySelect.disabled = true;
      }
      if (this.customCityInput) {
        this.customCityInput.style.display = 'none';
        this.customCityInput.value = '';
        this.customCityInput.required = false;
      }
    }
  }
  
  setValue(state, district, city) {
    this.stateSelect.value = state;
    this.selectedState = state;
    
    if (this.multiSelect) {
      this.populateDistrictsMulti();
      if (district) {
        if (!Array.isArray(district)) district = [district];
        district.forEach(d => {
          const cb = this.districtDropdown.querySelector(`input[value="${d}"]`);
          if (cb) {
            cb.checked = true;
            this.selectedDistricts.push(d);
          }
        });
        
        if (this.selectedDistricts.length === 0) {
          this.districtText.textContent = '-- Choose District(s) --';
        } else if (this.selectedDistricts.length <= 2) {
          this.districtText.textContent = this.selectedDistricts.join(', ');
        } else {
          this.districtText.textContent = `${this.selectedDistricts.length} Districts Selected`;
        }
        
        this.populateCitiesMulti();
        if (city) {
          if (!Array.isArray(city)) city = [city];
          city.forEach(c => {
            const cb = this.cityDropdown.querySelector(`input[value="${c}"]`);
            if (cb) {
              cb.checked = true;
              this.selectedCities.push(c);
            }
          });
          
          if (this.selectedCities.length === 0) {
            this.cityText.textContent = '-- Choose City/Cities --';
          } else if (this.selectedCities.length <= 2) {
            this.cityText.textContent = this.selectedCities.join(', ');
          } else {
            this.cityText.textContent = `${this.selectedCities.length} Cities Selected`;
          }
        }
      }
    } else {
      const stateChangeEvent = new Event('change');
      this.stateSelect.dispatchEvent(stateChangeEvent);
      
      this.districtSelect.value = district;
      const districtChangeEvent = new Event('change');
      this.districtSelect.dispatchEvent(districtChangeEvent);
      
      const citiesInDistrict = locationData[state] && locationData[state][district];
      if (citiesInDistrict && citiesInDistrict.includes(city)) {
        this.citySelect.value = city;
      } else {
        this.citySelect.value = 'CUSTOM';
        const cityChangeEvent = new Event('change');
        this.citySelect.dispatchEvent(cityChangeEvent);
        this.customCityInput.value = city;
      }
    }
  }
}

let userLocationSelector = null;
let assignmentsLocationSelector = null;

// Location data is loaded globally from js/locations.js


// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardLayout = document.getElementById('dashboardLayout');
// Sewa DOM Elements
const sewaConfigForm = document.getElementById('sewaConfigForm');
const sewaStateSelect = document.getElementById('sewaStateSelect');
const sewaStartDateInput = document.getElementById('sewaStartDateInput');
const sewaEndDateInput = document.getElementById('sewaEndDateInput');
const sewaPlaceholder = document.getElementById('sewaPlaceholder');
const sewaWorkspace = document.getElementById('sewaWorkspace');
const sewaActiveState = document.getElementById('sewaActiveState');
const sewaActiveStartDate = document.getElementById('sewaActiveStartDate');
const sewaActiveEndDate = document.getElementById('sewaActiveEndDate');
const clearSewaWorkspaceBtn = document.getElementById('clearSewaWorkspaceBtn');

const sewaAssignUserForm = document.getElementById('sewaAssignUserForm');
const sewaAssignDutyPointSelect = document.getElementById('sewaAssignDutyPointSelect');
const sewaAssignSubPointSelect = document.getElementById('sewaAssignSubPointSelect');

const sewaDistrictToggle = document.getElementById('sewaDistrictToggle');
const sewaDistrictSelectedText = document.getElementById('sewaDistrictSelectedText');
const sewaDistrictDropdown = document.getElementById('sewaDistrictDropdown');

const sewaCityToggle = document.getElementById('sewaCityToggle');
const sewaCitySelectedText = document.getElementById('sewaCitySelectedText');
const sewaCityDropdown = document.getElementById('sewaCityDropdown');

const sewaSelectAllMatchingUsers = document.getElementById('sewaSelectAllMatchingUsers');
const sewaMatchingUsersList = document.getElementById('sewaMatchingUsersList');

const sewaAssignmentsTableBody = document.getElementById('sewaAssignmentsTableBody');
const sewaSelectAllAssignments = document.getElementById('sewaSelectAllAssignments');
const sewaBulkUnassignBtn = document.getElementById('sewaBulkUnassignBtn');
const sewaPeriodsTableBody = document.getElementById('sewaPeriodsTableBody');
const loginForm = document.getElementById('loginForm');
const loginIdInput = document.getElementById('loginId');
const loginPasswordInput = document.getElementById('loginPassword');

const welcomeMessage = document.getElementById('welcomeMessage');
const adminUsername = document.getElementById('adminUsername');
const adminAvatar = document.getElementById('adminAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarItems = document.querySelectorAll('.sidebar-item[data-target]');
const sectionContainers = document.querySelectorAll('.section-container');

// General Assignment Elements
const assignmentYearSelect = document.getElementById('assignmentYearSelect');
const assignmentPlaceholder = document.getElementById('assignmentPlaceholder');
const assignmentsWorkspace = document.getElementById('assignmentsWorkspace');
const assignmentSewaBanner = document.getElementById('assignmentSewaBanner');
const assignmentActiveState = document.getElementById('assignmentActiveState');
const assignmentActiveStartDate = document.getElementById('assignmentActiveStartDate');
const assignmentActiveEndDate = document.getElementById('assignmentActiveEndDate');
const clearAssignmentSewaBtn = document.getElementById('clearAssignmentSewaBtn');

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

// Check Authentication status (Bypassed)
async function checkAuth() {
  showDashboard(currentAdmin);
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
  fetchSewaPeriods();
  
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

// Logout (Disabled)
logoutBtn.addEventListener('click', () => {
  showToast('Direct Admin Access is active. Sign out is disabled.', 'error');
});


// Sidebar Tab Routing
sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    sidebarItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const target = item.getAttribute('data-target');
    activeTab = target;
    sectionContainers.forEach(container => {
      container.classList.remove('active');
      if (container.id === target) {
        container.classList.add('active');
      }
    });

    if (target === 'usersSection') fetchUsers();
    else if (target === 'dutyPointsSection') fetchDutyPoints();
    else if (target === 'sewaSchedulesSection') {
      fetchUsers();
      fetchDutyPoints();
      fetchAssignments();
      fetchSewaPeriods();
      initializeSewaWorkspaceUI();
    }
    else if (target === 'assignmentsSection') {
      if (assignmentYearSelect) {
        if (activeSewaState && activeSewaStartDate && activeSewaEndDate) {
          const year = new Date(activeSewaStartDate).getFullYear().toString();
          assignmentYearSelect.value = year;
          assignmentPlaceholder.style.display = 'none';
          assignmentsWorkspace.style.display = 'block';
          
          document.getElementById('assignmentActiveState').textContent = activeSewaState;
          document.getElementById('assignmentActiveStartDate').textContent = activeSewaStartDate;
          document.getElementById('assignmentActiveEndDate').textContent = activeSewaEndDate;
          document.getElementById('assignmentSewaBanner').style.display = 'flex';

          if (assignmentsLocationSelector) {
            assignmentsLocationSelector.reset();
            assignmentsLocationSelector.setValue(activeSewaState);
            const stateFilterGrp = assignmentsLocationSelector.container.querySelector('#assignmentStateFilterGroup');
            if (stateFilterGrp) stateFilterGrp.style.display = 'none';
          }
        } else {
          assignmentYearSelect.value = "";
          assignmentPlaceholder.style.display = 'block';
          assignmentsWorkspace.style.display = 'none';
          document.getElementById('assignmentSewaBanner').style.display = 'none';

          if (assignmentsLocationSelector) {
            assignmentsLocationSelector.reset();
            const stateFilterGrp = assignmentsLocationSelector.container.querySelector('#assignmentStateFilterGroup');
            if (stateFilterGrp) stateFilterGrp.style.display = 'block';
          }
        }
      }
      fetchUsers();
      fetchDutyPoints();
      fetchAssignments();
    }
  });
});

// ================= USERS SECTION LOGIC =================
const userTableBody = document.getElementById('userTableBody');

const openAddUserModal = document.getElementById('openAddUserModal');
const closeAddUserModal = document.getElementById('closeAddUserModal');
const addUserModal = document.getElementById('addUserModal');
const cancelAddUser = document.getElementById('cancelAddUser');
const addUserForm = document.getElementById('addUserForm');
const userPhotoFile = document.getElementById('userPhotoFile');
const userPhotoPreview = document.getElementById('userPhotoPreview');
const userSearchInput = document.getElementById('userSearchInput');

openAddUserModal.addEventListener('click', () => {
  addUserModal.classList.add('active');
});
const closeModal = () => {
  addUserModal.classList.remove('active');
  addUserForm.reset();
  userPhotoPreview.style.display = 'none';
  userPhotoPreview.src = '#';
  
  if (userLocationSelector) {
    userLocationSelector.reset();
  }
  
  // Reset modal state
  document.getElementById('userModalTitle').textContent = 'Add New User Profile';
  editingUserId = null;
};
closeAddUserModal.addEventListener('click', closeModal);
cancelAddUser.addEventListener('click', closeModal);

// Dynamic Location Selector Populating Logic
function initializeLocationDropdowns() {
  // Populate States
  sewaStateSelect.innerHTML = '<option value="" disabled selected>-- Select State --</option>';
  Object.keys(locationData).forEach(state => {
    const optSewa = document.createElement('option');
    optSewa.value = state;
    optSewa.textContent = state;
    sewaStateSelect.appendChild(optSewa);
  });
}



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

async function fetchUsers() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      allUsers = await res.json();
      renderUsers(allUsers);
    }
  } catch (error) {
    console.error('Fetch users error:', error);
  }
}

function renderUsers(users) {
  userTableBody.innerHTML = '';
  if (users.length === 0) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
          No registered users found.
        </td>
      </tr>
    `;
    return;
  }

  users.forEach(user => {
    const row = document.createElement('tr');
    
    let avatarHTML = '';
    if (user.photo_url) {
      avatarHTML = `<img src="${API_BASE_URL.replace('/api', '')}${user.photo_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--glass-border);" alt="${user.full_name}">`;
    } else {
      const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--glass-border); font-size: 0.85rem; font-weight: 600; color: var(--accent-blue);">${initials}</div>`;
    }

    const dobFormatted = new Date(user.date_of_birth).toLocaleDateString();
    const joinFormatted = new Date(user.joining_date).toLocaleDateString();

    row.innerHTML = `
      <td>${avatarHTML}</td>
      <td style="font-weight: 600; color: var(--text-primary);">${user.full_name}</td>
      <td><span class="user-id-badge" style="margin-bottom: 0;">${user.sai_connect_id}</span></td>
      <td>${user.city}, ${user.district}, ${user.state}</td>
      <td style="font-size: 0.85rem;">${dobFormatted}</td>
      <td style="font-size: 0.85rem;">${joinFormatted}</td>
      <td>${user.zipcode}</td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
          <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8rem; border-color: rgba(139, 92, 246, 0.2); color: var(--accent-purple);" onclick="copyUser('${user.id}')" title="Copy User">
            <i data-lucide="copy" style="width: 14px; height: 14px; vertical-align: middle;"></i>
          </button>
          <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8rem; border-color: rgba(59, 130, 246, 0.2); color: var(--accent-blue);" onclick="editUser('${user.id}')" title="Edit User">
            <i data-lucide="pencil" style="width: 14px; height: 14px; vertical-align: middle;"></i>
          </button>
          <button class="btn btn-danger" style="padding: 6px 10px; font-size: 0.8rem;" onclick="deleteUser('${user.id}')" title="Delete User">
            <i data-lucide="trash-2" style="width: 14px; height: 14px; vertical-align: middle;"></i>
          </button>
        </div>
      </td>
    `;

    userTableBody.appendChild(row);
  });
  lucide.createIcons();
}


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

// Instantly duplicate user profile without showing the modal
window.copyUser = async function(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  const suffix = Math.floor(100 + Math.random() * 900);
  const newName = `${user.full_name} (Copy)`;
  const newSaiId = `${user.sai_connect_id}-C${suffix}`;

  try {
    showToast(`Duplicating user "${user.full_name}"...`, 'info');

    const formData = new FormData();
    formData.append('fullName', newName);
    formData.append('saiConnectId', newSaiId);
    formData.append('state', user.state);
    formData.append('district', user.district);
    formData.append('city', user.city);
    formData.append('zipcode', user.zipcode);
    formData.append('dateOfBirth', new Date(user.date_of_birth).toISOString().split('T')[0]);
    formData.append('joiningDate', new Date(user.joining_date).toISOString().split('T')[0]);

    // Send the POST request to create the user instantly
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
      body: formData
    });

    const data = await res.json();
    if (res.ok) {
      showToast(`User duplicated as "${newName}" successfully!`, 'success');
      fetchUsers();
    } else {
      showToast(data.error || 'Failed to duplicate user', 'error');
    }
  } catch (error) {
    console.error('Duplication error:', error);
    showToast('Failed to connect to the backend server', 'error');
  }
};

// Populate user data into modal form and enable editing mode
window.editUser = function(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  editingUserId = id;
  document.getElementById('userModalTitle').textContent = 'Edit User Profile';

  // Pre-fill input text fields
  document.getElementById('userFullName').value = user.full_name;
  document.getElementById('userSaiConnectId').value = user.sai_connect_id;
  document.getElementById('userZipcode').value = user.zipcode;
  
  // Format Date objects to YYYY-MM-DD for input[type="date"]
  document.getElementById('userDob').value = new Date(user.date_of_birth).toISOString().split('T')[0];
  document.getElementById('userJoiningDate').value = new Date(user.joining_date).toISOString().split('T')[0];

  // Set locations using modular component
  if (userLocationSelector) {
    userLocationSelector.setValue(user.state, user.district, user.city);
  }

  // Pre-fill profile photo preview
  if (user.photo_url) {
    userPhotoPreview.src = API_BASE_URL.replace('/api', '') + user.photo_url;
    userPhotoPreview.style.display = 'block';
  } else {
    userPhotoPreview.style.display = 'none';
    userPhotoPreview.src = '#';
  }

  // Display the edit modal
  addUserModal.classList.add('active');
};


addUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const selectedState = userLocationSelector ? userLocationSelector.selectedState : '';
  const selectedDistrict = (userLocationSelector && userLocationSelector.districtSelect) ? userLocationSelector.districtSelect.value : '';
  const selectedCity = userLocationSelector ? userLocationSelector.getCityValue() : '';

  const formData = new FormData();
  formData.append('fullName', document.getElementById('userFullName').value.trim());
  formData.append('saiConnectId', document.getElementById('userSaiConnectId').value.trim());
  formData.append('state', selectedState);
  formData.append('district', selectedDistrict);
  formData.append('city', selectedCity);
  formData.append('zipcode', document.getElementById('userZipcode').value.trim());
  formData.append('dateOfBirth', document.getElementById('userDob').value);
  formData.append('joiningDate', document.getElementById('userJoiningDate').value);


  const fileInput = document.getElementById('userPhotoFile');
  if (fileInput.files[0]) {
    formData.append('photo', fileInput.files[0]);
  }

  try {
    const url = editingUserId ? `${API_BASE_URL}/users/${editingUserId}` : `${API_BASE_URL}/users`;
    const method = editingUserId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: { 'Authorization': `Bearer ${currentToken}` },
      body: formData
    });
    const data = await res.json();

    if (res.ok) {
      showToast(editingUserId ? 'User profile updated successfully!' : 'User profile registered successfully!', 'success');
      closeModal();
      fetchUsers();
    } else {
      showToast(data.error || 'Error saving user', 'error');
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

addSubPointInputBtn.addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'sub-point-input-row';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.marginBottom = '8px';
  row.style.alignItems = 'center';
  row.innerHTML = `
    <input type="text" class="sub-point-input" placeholder="e.g. Exit Gate" style="flex-grow: 1;" required>
    <input type="number" class="sub-point-staff-req" min="1" value="1" placeholder="Req" style="width: 80px;" required>
    <button type="button" class="btn btn-danger remove-subpoint-btn" style="padding: 10px;">
      <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
    </button>
  `;
  subPointsList.appendChild(row);
  lucide.createIcons();

  row.querySelector('.remove-subpoint-btn').addEventListener('click', () => {
    row.remove();
  });
});

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
    
    const subbadges = point.sub_points.map(sp => {
      const subName = sp.name || sp;
      const subReq = sp.required_staff || 1;
      
      const assignedCount = allAssignments.filter(a => a.duty_point_id === point.id && a.assigned_sub_point === subName).length;
      const color = assignedCount >= subReq ? 'var(--accent-emerald)' : 'var(--accent-rose)';
      const badgeStyle = `background: var(--bg-tertiary); border: 1px solid var(--glass-border); padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; margin: 4px; display: inline-flex; align-items: center; gap: 6px;`;
      
      return `<span style="${badgeStyle}">
        <span style="font-weight: 500; color: var(--text-primary);">${subName}</span>
        <span style="background: rgba(0,0,0,0.25); padding: 1px 6px; border-radius: 6px; font-size: 0.75rem; color: ${color}; font-weight: 600;" title="Assigned / Required">
          ${assignedCount}/${subReq}
        </span>
      </span>`;
    }).join('');

    const totalRequired = point.sub_points.reduce((sum, sp) => sum + (sp.required_staff || 1), 0);
    const totalAssigned = allAssignments.filter(a => a.duty_point_id === point.id).length;

    card.innerHTML = `
      <div class="duty-card-header">
        <div>
          <span style="font-size:0.75rem; text-transform:uppercase; color: var(--text-muted); font-weight:600;">Main Point</span>
          <h4 class="duty-main-point">${point.main_point} (${totalAssigned}/${totalRequired})</h4>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="padding: 6px 10px; border-color: rgba(59, 130, 246, 0.2); color: var(--accent-blue);" onclick="editDutyPoint('${point.id}')" title="Edit Duty Point">
            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
          </button>
          <button class="btn btn-danger" style="padding: 6px 10px;" onclick="deleteDutyPoint('${point.id}')" title="Delete Duty Point">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>
      <span style="font-size:0.75rem; text-transform:uppercase; color: var(--text-muted); font-weight:600; display:block; margin-top: 14px; margin-bottom: 6px;">Sub Points (${point.sub_points.length})</span>
      <div class="subpoints-container" style="display: flex; flex-wrap: wrap; margin: -4px;">
        ${subbadges}
      </div>
    `;
    dutyGrid.appendChild(card);
  });
  lucide.createIcons();
}

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

window.editDutyPoint = function(id) {
  const point = allDutyPoints.find(p => p.id === id);
  if (!point) return;

  editingDutyPointId = id;
  
  const formHeader = addDutyPointForm.closest('.card').querySelector('h3');
  if (formHeader) {
    formHeader.textContent = 'Edit Duty Point';
  }

  const submitBtnText = addDutyPointForm.querySelector('button[type="submit"] span');
  if (submitBtnText) {
    submitBtnText.textContent = 'Update Duty Point';
  }

  document.getElementById('mainPoint').value = point.main_point;

  subPointsList.innerHTML = '';
  point.sub_points.forEach((sub, idx) => {
    const subName = sub.name || sub;
    const subReq = sub.required_staff || 1;
    
    const row = document.createElement('div');
    row.className = 'sub-point-input-row';
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.marginBottom = '8px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <input type="text" class="sub-point-input" placeholder="e.g. Exit Gate" style="flex-grow: 1;" value="${subName}" required>
      <input type="number" class="sub-point-staff-req" min="1" value="${subReq}" placeholder="Req" style="width: 80px;" required>
      <button type="button" class="btn btn-danger remove-subpoint-btn" style="padding: 10px;" ${idx === 0 ? 'disabled' : ''}>
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    `;
    subPointsList.appendChild(row);
    
    row.querySelector('.remove-subpoint-btn').addEventListener('click', () => {
      row.remove();
    });
  });
  
  if (!document.getElementById('cancelEditDutyPointBtn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancelEditDutyPointBtn';
    cancelBtn.className = 'btn btn-secondary btn-block';
    cancelBtn.style.marginTop = '10px';
    cancelBtn.textContent = 'Cancel Edit';
    cancelBtn.addEventListener('click', resetDutyPointForm);
    addDutyPointForm.appendChild(cancelBtn);
  }
  
  lucide.createIcons();
};

function resetDutyPointForm() {
  editingDutyPointId = null;
  const formHeader = addDutyPointForm.closest('.card').querySelector('h3');
  if (formHeader) {
    formHeader.textContent = 'Create Duty Point';
  }

  const submitBtnText = addDutyPointForm.querySelector('button[type="submit"] span');
  if (submitBtnText) {
    submitBtnText.textContent = 'Save Duty Point';
  }

  addDutyPointForm.reset();
  
  const cancelBtn = document.getElementById('cancelEditDutyPointBtn');
  if (cancelBtn) cancelBtn.remove();
  
  subPointsList.innerHTML = `
    <div class="sub-point-input-row" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
      <input type="text" class="sub-point-input" placeholder="e.g. Entry Turnstile" style="flex-grow: 1;" required>
      <input type="number" class="sub-point-staff-req" min="1" value="1" placeholder="Req" style="width: 80px;" required>
      <button type="button" class="btn btn-danger remove-subpoint-btn" style="padding: 10px;" disabled>
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    </div>
  `;
}

addDutyPointForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const mainPoint = document.getElementById('mainPoint').value.trim();
  const rows = subPointsList.querySelectorAll('.sub-point-input-row');
  
  const subPoints = [];
  rows.forEach(row => {
    const nameInput = row.querySelector('.sub-point-input');
    const reqInput = row.querySelector('.sub-point-staff-req');
    if (nameInput && nameInput.value.trim().length > 0) {
      subPoints.push({
        name: nameInput.value.trim(),
        requiredStaff: parseInt(reqInput.value, 10) || 1
      });
    }
  });

  try {
    const url = editingDutyPointId ? `${API_BASE_URL}/duty-points/${editingDutyPointId}` : `${API_BASE_URL}/duty-points`;
    const method = editingDutyPointId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ mainPoint, subPoints })
    });
    const data = await res.json();

    if (res.ok) {
      showToast(editingDutyPointId ? 'Duty Point updated successfully!' : 'Duty Point created successfully!', 'success');
      resetDutyPointForm();
      fetchDutyPoints();
    } else {
      showToast(data.error || 'Failed to save duty point', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to the backend server', 'error');
  }
});


// ================= ASSIGNMENT SECTION LOGIC =================
const assignDutyPointSelect = document.getElementById('assignDutyPointSelect');
const assignSubPointSelect = document.getElementById('assignSubPointSelect');
const assignUserForm = document.getElementById('assignUserForm');
const assignmentsTableBody = document.getElementById('assignmentsTableBody');
const assignmentSearchInput = document.getElementById('assignmentSearchInput');
const assignmentStateSelect = document.getElementById('assignmentStateSelect');

// Multiselect Elements
const districtToggle = document.getElementById('districtToggle');
const districtSelectedText = document.getElementById('districtSelectedText');
const districtDropdown = document.getElementById('districtDropdown');

const cityToggle = document.getElementById('cityToggle');
const citySelectedText = document.getElementById('citySelectedText');
const cityDropdown = document.getElementById('cityDropdown');

const selectAllMatchingUsers = document.getElementById('selectAllMatchingUsers');
const matchingUsersList = document.getElementById('matchingUsersList');

let selectedDistricts = [];
let selectedCities = [];

// Clear districts/cities and update dropdown when Assignments State filter changes
if (assignmentStateSelect) {
  assignmentStateSelect.addEventListener('change', () => {
    selectedDistricts = [];
    selectedCities = [];
    if (districtSelectedText) districtSelectedText.textContent = '-- Choose District(s) --';
    if (citySelectedText) citySelectedText.textContent = '-- Choose City/Cities --';
    if (districtDropdown) districtDropdown.innerHTML = '';
    if (cityDropdown) cityDropdown.innerHTML = '';
    matchingUsersList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          Please configure location filters to see matching staff.
        </td>
      </tr>
    `;
    populateDistrictDropdown();
  });
}

// Dropdown toggle logic
if (districtToggle) {
  districtToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (districtDropdown) districtDropdown.classList.toggle('active');
    if (cityDropdown) cityDropdown.classList.remove('active');
  });
}

if (cityToggle) {
  cityToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cityDropdown) cityDropdown.classList.toggle('active');
    if (districtDropdown) districtDropdown.classList.remove('active');
  });
}

document.addEventListener('click', () => {
  if (districtDropdown) districtDropdown.classList.remove('active');
  if (cityDropdown) cityDropdown.classList.remove('active');
});

if (districtDropdown) districtDropdown.addEventListener('click', (e) => e.stopPropagation());
if (cityDropdown) cityDropdown.addEventListener('click', (e) => e.stopPropagation());

// Populate District Dropdown
function populateDistrictDropdown() {
  const selectedState = activeSewaState || (assignmentStateSelect ? assignmentStateSelect.value : null);
  
  districtDropdown.innerHTML = '';
  selectedDistricts = [];
  districtSelectedText.textContent = '-- Choose District(s) --';
  
  if (!selectedState) {
    districtDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">Select state first</div>';
    populateCityDropdown();
    return;
  }
  
  const uniqueDistricts = (locationData[selectedState] ? Object.keys(locationData[selectedState]) : []).sort();
  
  if (uniqueDistricts.length === 0) {
    districtDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">No districts found</div>';
    populateCityDropdown();
    return;
  }
  
  uniqueDistricts.forEach(district => {
    const option = document.createElement('div');
    option.className = 'multiselect-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = district;
    checkbox.id = `dist_${district.replace(/\s+/g, '_')}`;
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = district;
    label.style.cursor = 'pointer';
    label.style.flexGrow = '1';
    
    option.appendChild(checkbox);
    option.appendChild(label);
    districtDropdown.appendChild(option);
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedDistricts.push(district);
      } else {
        selectedDistricts = selectedDistricts.filter(d => d !== district);
      }
      
      if (selectedDistricts.length === 0) {
        districtSelectedText.textContent = '-- Choose District(s) --';
      } else if (selectedDistricts.length <= 2) {
        districtSelectedText.textContent = selectedDistricts.join(', ');
      } else {
        districtSelectedText.textContent = `${selectedDistricts.length} Districts Selected`;
      }
      
      populateCityDropdown();
    });
  });
}

// Replaced by reusable modular LocationSelector component logic

// Calculate age helper
function calculateAge(dobString) {
  if (!dobString) return 'N/A';
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// Render matching users
function renderMatchingUsers() {
  matchingUsersList.innerHTML = '';
  selectAllMatchingUsers.checked = true;
  
  const compSelectedDistricts = assignmentsLocationSelector ? assignmentsLocationSelector.selectedDistricts : [];
  const compSelectedCities = assignmentsLocationSelector ? assignmentsLocationSelector.selectedCities : [];
  
  if (compSelectedDistricts.length === 0) {
    matchingUsersList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          Please configure location filters to see matching staff.
        </td>
      </tr>
    `;
    return;
  }
  
  const selectedState = activeSewaState || (assignmentsLocationSelector ? assignmentsLocationSelector.selectedState : null);
  const matched = allUsers.filter(u => {
    if (selectedState && u.state !== selectedState) return false;
    
    const districtMatch = compSelectedDistricts.includes(u.district);
    if (!districtMatch) return false;
    
    if (compSelectedCities.length > 0) {
      return compSelectedCities.includes(u.city);
    }
    return true;
  });
  
  if (matched.length === 0) {
    matchingUsersList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          No users found in the selected location(s).
        </td>
      </tr>
    `;
    return;
  }
  
  matched.forEach(user => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--glass-border)';
    
    const age = calculateAge(user.date_of_birth);
    
    row.innerHTML = `
      <td style="padding: 10px 12px; vertical-align: middle;">
        <input type="checkbox" class="matching-user-checkbox" value="${user.id}" checked style="width: 16px; height: 16px; accent-color: var(--accent-purple); cursor: pointer;">
      </td>
      <td style="padding: 10px 12px; font-weight: 500; color: var(--text-primary); vertical-align: middle;">
        ${user.full_name} <span style="font-size:0.75rem; color: var(--text-muted); display:block;">${user.sai_connect_id}</span>
      </td>
      <td style="padding: 10px 12px; vertical-align: middle;">${age} yrs</td>
      <td style="padding: 10px 12px; color: var(--text-secondary); vertical-align: middle;">
        ${user.district}, ${user.city}
      </td>
    `;
    matchingUsersList.appendChild(row);
  });
}

// Master checkbox toggle
selectAllMatchingUsers.addEventListener('change', function() {
  const checkboxes = matchingUsersList.querySelectorAll('.matching-user-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = selectAllMatchingUsers.checked;
  });
});

function populateDutyPointsDropdown(points) {
  assignDutyPointSelect.innerHTML = '<option value="" disabled selected>-- Choose Duty Point --</option>';
  points.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.main_point;
    assignDutyPointSelect.appendChild(opt);
  });
  assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
  assignSubPointSelect.disabled = true;
}

assignDutyPointSelect.addEventListener('change', function() {
  const pointId = this.value;
  const selectedPoint = allDutyPoints.find(p => p.id === pointId);

  if (selectedPoint && selectedPoint.sub_points.length > 0) {
    assignSubPointSelect.disabled = false;
    assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Choose Sub Point --</option>';
    selectedPoint.sub_points.forEach(sub => {
      const subName = sub.name || sub;
      const subReq = sub.required_staff || 1;
      const opt = document.createElement('option');
      opt.value = subName;
      opt.textContent = `${subName} (Req: ${subReq})`;
      assignSubPointSelect.appendChild(opt);
    });
  } else {
    assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- No Sub-points configured --</option>';
    assignSubPointSelect.disabled = true;
  }
});

async function fetchAssignments() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/assignments`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      allAssignments = await res.json();
      if (document.getElementById('assignmentYearSelect') && document.getElementById('assignmentYearSelect').value) {
        filterAndRenderGeneralAssignments();
      } else {
        renderAssignments(allAssignments);
      }
    }
  } catch (error) {
    console.error('Fetch assignments error:', error);
  }
}

const selectAllAssignments = document.getElementById('selectAllAssignments');
const bulkUnassignBtn = document.getElementById('bulkUnassignBtn');

function updateBulkUnassignButtonState() {
  const checkboxes = assignmentsTableBody.querySelectorAll('.assignment-row-checkbox');
  const checkedBoxes = assignmentsTableBody.querySelectorAll('.assignment-row-checkbox:checked');
  
  if (checkedBoxes.length > 0) {
    bulkUnassignBtn.style.display = 'inline-flex';
    bulkUnassignBtn.querySelector('span').textContent = `Unassign Selected (${checkedBoxes.length})`;
  } else {
    bulkUnassignBtn.style.display = 'none';
  }
  
  if (checkboxes.length > 0 && checkedBoxes.length === checkboxes.length) {
    selectAllAssignments.checked = true;
  } else {
    selectAllAssignments.checked = false;
  }
}

selectAllAssignments.addEventListener('change', function() {
  const checkboxes = assignmentsTableBody.querySelectorAll('.assignment-row-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = selectAllAssignments.checked;
  });
  updateBulkUnassignButtonState();
});

bulkUnassignBtn.addEventListener('click', async () => {
  const checkedBoxes = assignmentsTableBody.querySelectorAll('.assignment-row-checkbox:checked');
  const assignmentIds = Array.from(checkedBoxes).map(cb => cb.value);
  
  if (assignmentIds.length === 0) return;
  
  if (!confirm(`Are you sure you want to end duty allocations for these ${assignmentIds.length} staff members?`)) return;
  
  try {
    showToast(`Ending allocations for ${assignmentIds.length} staff...`, 'info');
    
    const unassignPromises = assignmentIds.map(id => {
      return fetch(`${API_BASE_URL}/assignments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
    });
    
    const results = await Promise.all(unassignPromises);
    
    let successCount = 0;
    for (let r of results) {
      if (r.ok) successCount++;
    }
    
    if (successCount > 0) {
      showToast(`Successfully ended ${successCount} duty allocations!`, 'success');
      selectAllAssignments.checked = false;
      bulkUnassignBtn.style.display = 'none';
      fetchAssignments();
    } else {
      showToast('Failed to end allocations', 'error');
    }
  } catch (error) {
    console.error('Bulk unassign error:', error);
    showToast('Failed to connect to the backend server', 'error');
  }
});

function renderAssignments(assignments) {
  assignmentsTableBody.innerHTML = '';
  selectAllAssignments.checked = false;
  bulkUnassignBtn.style.display = 'none';

  if (assignments.length === 0) {
    assignmentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
          No active duty assignments.
        </td>
      </tr>
    `;
    return;
  }

  assignments.forEach(assign => {
    const row = document.createElement('tr');
    const userName = assign.user ? assign.user.full_name : 'Unknown User';
    const userSaiId = assign.user ? assign.user.sai_connect_id : 'N/A';
    const userCity = assign.user ? `${assign.user.city}, ${assign.user.state}` : 'N/A';
    const mainPoint = assign.duty_point ? assign.duty_point.main_point : 'Unknown Point';
    const assignedDate = new Date(assign.assigned_at).toLocaleDateString() + ' ' + new Date(assign.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <td style="padding: 12px; vertical-align: middle;">
        <input type="checkbox" class="assignment-row-checkbox" value="${assign.id}" style="width: 16px; height: 16px; accent-color: var(--accent-purple); cursor: pointer;">
      </td>
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
    
    // Bind change listener to checkboxes
    row.querySelector('.assignment-row-checkbox').addEventListener('change', updateBulkUnassignButtonState);
  });
}

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

// ================= GENERAL ASSIGNMENTS YEAR FILTER LOGIC =================

if (assignmentYearSelect) {
  assignmentYearSelect.addEventListener('change', function() {
    const selectedYear = this.value;
    if (selectedYear) {
      assignmentPlaceholder.style.display = 'none';
      assignmentsWorkspace.style.display = 'block';
      filterAndRenderGeneralAssignments();
    } else {
      assignmentPlaceholder.style.display = 'block';
      assignmentsWorkspace.style.display = 'none';
    }
  });
}

if (clearAssignmentSewaBtn) {
  clearAssignmentSewaBtn.addEventListener('click', () => {
    activeSewaState = null;
    activeSewaStartDate = null;
    activeSewaEndDate = null;
    
    assignmentSewaBanner.style.display = 'none';
    assignmentYearSelect.value = "";
    assignmentPlaceholder.style.display = 'block';
    assignmentsWorkspace.style.display = 'none';
    
    if (assignmentsLocationSelector) {
      assignmentsLocationSelector.reset();
      const stateFilterGrp = assignmentsLocationSelector.container.querySelector('#assignmentStateFilterGroup');
      if (stateFilterGrp) stateFilterGrp.style.display = 'block';
    }
    
    matchingUsersList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          Please configure location filters to see matching staff.
        </td>
      </tr>
    `;
    
    fetchAssignments();
    showToast('Sewa context cleared. Switched to General Assignments mode.', 'info');
  });
}

function filterAndRenderGeneralAssignments() {
  if (!assignmentYearSelect) return;
  const selectedYear = assignmentYearSelect.value;
  if (!selectedYear) {
    renderAssignments([]);
    return;
  }

  const filtered = allAssignments.filter(assign => {
    if (!assign.sewa_start_date) return false;
    const year = new Date(assign.sewa_start_date).getFullYear().toString();
    return year === selectedYear;
  });

  renderAssignments(filtered);
}

assignUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const dutyPointId = assignDutyPointSelect.value;
  const assignedSubPoint = assignSubPointSelect.value;
  
  if (!dutyPointId || !assignedSubPoint) {
    showToast('Please select duty point and sub-point', 'error');
    return;
  }
  
  const checkboxes = matchingUsersList.querySelectorAll('.matching-user-checkbox:checked');
  const userIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (userIds.length === 0) {
    showToast('Please select at least one staff member from the matching list', 'error');
    return;
  }
  
  // Check if any of the selected users are already assigned to a duty point during this Sewa context (or active period)
  const alreadyAssigned = [];
  userIds.forEach(userId => {
    const existing = allAssignments.find(a => {
      if (activeSewaState) {
        return a.user_id === userId &&
               a.sewa_state === activeSewaState &&
               a.sewa_start_date === activeSewaStartDate &&
               a.sewa_end_date === activeSewaEndDate;
      } else {
        return a.user_id === userId;
      }
    });
    if (existing) {
      alreadyAssigned.push({
        id: existing.id,
        userId: userId,
        userName: existing.user ? existing.user.full_name : 'Unknown User',
        mainPoint: existing.duty_point ? existing.duty_point.main_point : 'Unknown Point',
        subPoint: existing.assigned_sub_point,
        sewa_start_date: existing.sewa_start_date,
        sewa_end_date: existing.sewa_end_date,
        sewa_state: existing.sewa_state
      });
    }
  });

  if (alreadyAssigned.length > 0) {
    openReassignModal(alreadyAssigned);
    return;
  }
  
  try {
    showToast(`Assigning ${userIds.length} staff members to duty...`, 'info');
    
    const assignmentPromises = userIds.map(userId => {
      const bodyObj = { userId, dutyPointId, assignedSubPoint };
      if (activeSewaState) {
        bodyObj.sewaStartDate = activeSewaStartDate;
        bodyObj.sewaEndDate = activeSewaEndDate;
        bodyObj.sewaState = activeSewaState;
      }
      return fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(bodyObj)
      });
    });
    
    const results = await Promise.all(assignmentPromises);
    
    let successCount = 0;
    for (let r of results) {
      if (r.ok) successCount++;
    }
    
    if (successCount > 0) {
      showToast(`Successfully assigned ${successCount} staff to duty!`, 'success');
      
      if (assignmentsLocationSelector) {
        assignmentsLocationSelector.reset();
      }
      assignUserForm.reset();
      assignSubPointSelect.disabled = true;
      assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
      
      fetchAssignments();
    } else {
      showToast('Failed to assign selected staff. Check if they are already assigned.', 'error');
    }
  } catch (error) {
    console.error('Batch assignment error:', error);
    showToast('Failed to connect to the backend server', 'error');
  }
});

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

// ================= REASSIGN STAFF LOGIC =================
const reassignModal = document.getElementById('reassignModal');
const closeReassignModal = document.getElementById('closeReassignModal');
const cancelReassign = document.getElementById('cancelReassign');
const reassignForm = document.getElementById('reassignForm');

const reassignWarningBlock = document.getElementById('reassignWarningBlock');
const reassignWarningText = document.getElementById('reassignWarningText');
const closeReassignWarningBtn = document.getElementById('closeReassignWarningBtn');

const reassignNewMainPoint = document.getElementById('reassignNewMainPoint');
const reassignNewSubPoint = document.getElementById('reassignNewSubPoint');

let reassigningUsers = [];
let activeReassignUser = null;

function openReassignModal(alreadyAssignedList) {
  reassigningUsers = alreadyAssignedList;
  activeReassignUser = null;
  
  renderReassignWarningList();
  
  reassignWarningBlock.style.display = 'block';
  reassignForm.style.display = 'none';
  
  reassignModal.classList.add('active');
  lucide.createIcons();
}

function renderReassignWarningList() {
  const warningList = document.getElementById('reassignWarningList');
  warningList.innerHTML = '';
  
  if (reassigningUsers.length === 0) {
    warningList.innerHTML = '<div style="text-align: center; padding: 12px; color: var(--text-muted);">No remaining users to reassign</div>';
    return;
  }
  
  reassigningUsers.forEach((u, index) => {
    const row = document.createElement('div');
    row.style.padding = '8px 0';
    row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.gap = '12px';
    
    row.innerHTML = `
      <div style="flex-grow: 1;">
        <span style="font-weight: 600; color: var(--text-primary); display: block;">${u.userName}</span>
        <span style="color: var(--text-secondary); font-size: 0.85rem;">Currently: ${u.mainPoint} - ${u.subPoint}</span>
      </div>
      <button class="btn btn-primary reassign-single-btn" data-index="${index}" style="padding: 6px 12px; font-size: 0.8rem; background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%); flex-shrink: 0;">
        <span>Change</span>
      </button>
    `;
    warningList.appendChild(row);
    
    row.querySelector('.reassign-single-btn').addEventListener('click', () => {
      startReassignment(u);
    });
  });
}

function startReassignment(userObj) {
  activeReassignUser = userObj;
  
  document.getElementById('reassignSingleUserName').textContent = userObj.userName;
  document.getElementById('reassignSingleOldDuty').textContent = `${userObj.mainPoint} - ${userObj.subPoint}`;
  
  reassignNewMainPoint.innerHTML = '<option value="" disabled selected>-- Choose Duty Point --</option>';
  allDutyPoints.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.main_point;
    reassignNewMainPoint.appendChild(opt);
  });
  
  reassignNewSubPoint.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
  reassignNewSubPoint.disabled = true;
  
  reassignWarningBlock.style.display = 'none';
  reassignForm.style.display = 'block';
  
  lucide.createIcons();
}

reassignNewMainPoint.addEventListener('change', function() {
  const pointId = this.value;
  const selectedPoint = allDutyPoints.find(p => p.id === pointId);

  if (selectedPoint && selectedPoint.sub_points.length > 0) {
    reassignNewSubPoint.disabled = false;
    reassignNewSubPoint.innerHTML = '<option value="" disabled selected>-- Choose Sub Point --</option>';
    selectedPoint.sub_points.forEach(sub => {
      const subName = sub.name || sub;
      const subReq = sub.required_staff || 1;
      const opt = document.createElement('option');
      opt.value = subName;
      opt.textContent = `${subName} (Req: ${subReq})`;
      reassignNewSubPoint.appendChild(opt);
    });
  } else {
    reassignNewSubPoint.innerHTML = '<option value="" disabled selected>-- No Sub-points configured --</option>';
    reassignNewSubPoint.disabled = true;
  }
});

const closeReassign = () => {
  reassignModal.classList.remove('active');
  reassignForm.reset();
  reassignNewSubPoint.disabled = true;
  reassignWarningBlock.style.display = 'block';
  reassignForm.style.display = 'none';
  reassigningUsers = [];
  activeReassignUser = null;
};
closeReassignModal.addEventListener('click', closeReassign);
closeReassignWarningBtn.addEventListener('click', closeReassign);

cancelReassign.addEventListener('click', () => {
  reassignForm.reset();
  reassignNewSubPoint.disabled = true;
  reassignWarningBlock.style.display = 'block';
  reassignForm.style.display = 'none';
  activeReassignUser = null;
  renderReassignWarningList();
});

reassignForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const dutyPointId = reassignNewMainPoint.value;
  const assignedSubPoint = reassignNewSubPoint.value;
  
  if (!activeReassignUser) return;
  
  try {
    showToast(`Reassigning ${activeReassignUser.userName}...`, 'info');
    
    // 1. Delete old assignment
    const delRes = await fetch(`${API_BASE_URL}/assignments/${activeReassignUser.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    
    if (!delRes.ok) {
      showToast('Failed to remove old assignment', 'error');
      return;
    }
    
    // 2. Create new assignment
    const addRes = await fetch(`${API_BASE_URL}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ 
        userId: activeReassignUser.userId, 
        dutyPointId, 
        assignedSubPoint,
        sewaStartDate: activeReassignUser.sewa_start_date || null,
        sewaEndDate: activeReassignUser.sewa_end_date || null,
        sewaState: activeReassignUser.sewa_state || null
      })
    });
    
    if (addRes.ok) {
      showToast(`Successfully reassigned ${activeReassignUser.userName} to new duty!`, 'success');
      
      // Remove this user from the queue list
      reassigningUsers = reassigningUsers.filter(u => u.userId !== activeReassignUser.userId);
      activeReassignUser = null;
      
      if (reassigningUsers.length > 0) {
        reassignForm.reset();
        reassignNewSubPoint.disabled = true;
        reassignWarningBlock.style.display = 'block';
        reassignForm.style.display = 'none';
        renderReassignWarningList();
      } else {
        closeReassign();
      }
      
      populateDistrictDropdown();
      assignUserForm.reset();
      assignSubPointSelect.disabled = true;
      assignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
      
      fetchAssignments();
    } else {
      showToast('Failed to complete assignment', 'error');
    }
  } catch (error) {
    console.error('Reassignment error:', error);
    showToast('Failed to connect to the backend server', 'error');
  }
});


// ================= PRASHANTI SEWA CO-ORDINATOR LOGIC =================
async function fetchSewaPeriods() {
  if (!currentToken) return;
  try {
    const res = await fetch(`${API_BASE_URL}/sewa-periods`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      allSewaPeriods = await res.json();
      renderSewaPeriods(allSewaPeriods);
    }
  } catch (error) {
    console.error('Fetch sewa periods error:', error);
  }
}

function renderSewaPeriods(periods) {
  sewaPeriodsTableBody.innerHTML = '';
  if (periods.length === 0) {
    sewaPeriodsTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          No configured Sewa periods found. Create one above.
        </td>
      </tr>
    `;
    return;
  }

  periods.forEach(p => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--glass-border)';
    
    const startFormatted = new Date(p.start_date).toLocaleDateString();
    const endFormatted = new Date(p.end_date).toLocaleDateString();

    row.innerHTML = `
      <td style="padding: 12px; font-weight: 600; color: var(--text-primary);">${p.state}</td>
      <td style="padding: 12px;">${startFormatted}</td>
      <td style="padding: 12px;">${endFormatted}</td>
      <td style="padding: 12px; text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
          <button class="btn btn-primary assign-duties-btn" style="padding: 6px 12px; font-size: 0.8rem; background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%);">
            <i data-lucide="arrow-right-to-line" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>
            <span>Assign Duties</span>
          </button>
          <button class="btn btn-danger delete-sewa-period-btn" style="padding: 6px 10px; font-size: 0.8rem;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px; vertical-align: middle;"></i>
          </button>
        </div>
      </td>
    `;
    sewaPeriodsTableBody.appendChild(row);

    // Click listeners
    row.querySelector('.assign-duties-btn').addEventListener('click', () => {
      activeSewaState = p.state;
      activeSewaStartDate = p.start_date.split('T')[0];
      activeSewaEndDate = p.end_date.split('T')[0];

      // Reset multiselect state variables and selections
      selectedDistricts = [];
      selectedCities = [];
      districtSelectedText.textContent = '-- Choose District(s) --';
      citySelectedText.textContent = '-- Choose City/Cities --';
      districtDropdown.innerHTML = '';
      cityDropdown.innerHTML = '';

      // Trigger redirect to assignments section
      const assignmentsTabItem = document.querySelector('.sidebar-item[data-target="assignmentsSection"]');
      if (assignmentsTabItem) {
        assignmentsTabItem.click();
      }
      showToast(`Redirected to Assignments tab for ${p.state} Sewa period!`, 'success');
    });

    row.querySelector('.delete-sewa-period-btn').addEventListener('click', () => {
      deleteSewaPeriod(p.id);
    });
  });
  lucide.createIcons();
}

async function deleteSewaPeriod(id) {
  if (!confirm('Are you sure you want to delete this Sewa period batch configuration?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/sewa-periods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast('Sewa period configuration deleted', 'success');
      fetchSewaPeriods();
      
      const deletedPeriod = allSewaPeriods.find(p => p.id === id);
      if (deletedPeriod && 
          currentSewaState === deletedPeriod.state && 
          currentSewaStartDate === deletedPeriod.start_date.split('T')[0] && 
          currentSewaEndDate === deletedPeriod.end_date.split('T')[0]) {
        currentSewaState = null;
        currentSewaStartDate = null;
        currentSewaEndDate = null;
        initializeSewaWorkspaceUI();
      }
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete sewa period', 'error');
    }
  } catch (error) {
    showToast('Connection error during deletion', 'error');
  }
}

function initializeSewaWorkspaceUI() {
  if (currentSewaState && currentSewaStartDate && currentSewaEndDate) {
    if (sewaPlaceholder) sewaPlaceholder.style.display = 'none';
    if (sewaWorkspace) sewaWorkspace.style.display = 'block';
    if (sewaActiveState) sewaActiveState.textContent = currentSewaState;
    if (sewaActiveStartDate) sewaActiveStartDate.textContent = currentSewaStartDate;
    if (sewaActiveEndDate) sewaActiveEndDate.textContent = currentSewaEndDate;

    // Populate Sewa Duty Points Dropdown
    populateSewaDutyPointsDropdown(allDutyPoints);
    
    // Populate Sewa District Dropdown
    populateSewaDistrictDropdown();

    // Render assignments matching this Sewa Batch
    filterAndRenderSewaAssignments();
  } else {
    if (sewaPlaceholder) sewaPlaceholder.style.display = 'block';
    if (sewaWorkspace) sewaWorkspace.style.display = 'none';
  }
}

// Auto-calculate Releasing Date (7 days after start date)
sewaStartDateInput.addEventListener('change', function() {
  const startDateVal = this.value;
  if (startDateVal) {
    // Prevent selecting releasing date prior to start date
    sewaEndDateInput.min = startDateVal;

    const startDate = new Date(startDateVal);
    startDate.setDate(startDate.getDate() + 7);
    sewaEndDateInput.value = startDate.toISOString().split('T')[0];
  } else {
    sewaEndDateInput.min = '';
  }
});

// Config form submission
sewaConfigForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const state = sewaStateSelect.value;
  const startDate = sewaStartDateInput.value;
  const endDate = sewaEndDateInput.value;

  if (!state || !startDate || !endDate) {
    showToast('Please fill all configuration fields', 'error');
    return;
  }

  try {
    showToast('Saving Sewa Period...', 'info');
    const res = await fetch(`${API_BASE_URL}/sewa-periods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ state, startDate, endDate })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('Sewa period configured and saved successfully!', 'success');
      sewaConfigForm.reset();
      fetchSewaPeriods();
    } else {
      showToast(data.error || 'Failed to save Sewa period', 'error');
    }
  } catch (error) {
    console.error('Save sewa period error:', error);
    showToast('Failed to connect to the backend server', 'error');
  }
});

// Clear Workspace context
if (clearSewaWorkspaceBtn) {
  clearSewaWorkspaceBtn.addEventListener('click', () => {
    currentSewaState = null;
    currentSewaStartDate = null;
    currentSewaEndDate = null;
    sewaSelectedDistricts = [];
    sewaSelectedCities = [];
    sewaConfigForm.reset();
    initializeSewaWorkspaceUI();
    showToast('Workspace context cleared.', 'info');
  });
}

// Sewa Multiselect Toggle handlers
if (sewaDistrictToggle) {
  sewaDistrictToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sewaDistrictDropdown.classList.toggle('active');
    sewaCityDropdown.classList.remove('active');
  });
}

if (sewaCityToggle) {
  sewaCityToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sewaCityDropdown.classList.toggle('active');
    sewaDistrictDropdown.classList.remove('active');
  });
}

// Close dropdowns on document click
document.addEventListener('click', () => {
  if (sewaDistrictDropdown) sewaDistrictDropdown.classList.remove('active');
  if (sewaCityDropdown) sewaCityDropdown.classList.remove('active');
});

if (sewaDistrictDropdown) sewaDistrictDropdown.addEventListener('click', (e) => e.stopPropagation());
if (sewaCityDropdown) sewaCityDropdown.addEventListener('click', (e) => e.stopPropagation());

// Populate Sewa Duty Points Dropdown
function populateSewaDutyPointsDropdown(points) {
  sewaAssignDutyPointSelect.innerHTML = '<option value="" disabled selected>-- Choose Duty Point --</option>';
  points.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.main_point;
    sewaAssignDutyPointSelect.appendChild(opt);
  });
  sewaAssignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
  sewaAssignSubPointSelect.disabled = true;
}

sewaAssignDutyPointSelect.addEventListener('change', function() {
  const pointId = this.value;
  const selectedPoint = allDutyPoints.find(p => p.id === pointId);

  if (selectedPoint && selectedPoint.sub_points.length > 0) {
    sewaAssignSubPointSelect.disabled = false;
    sewaAssignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Choose Sub Point --</option>';
    selectedPoint.sub_points.forEach(sub => {
      const subName = sub.name || sub;
      const subReq = sub.required_staff || 1;
      const opt = document.createElement('option');
      opt.value = subName;
      opt.textContent = `${subName} (Req: ${subReq})`;
      sewaAssignSubPointSelect.appendChild(opt);
    });
  } else {
    sewaAssignSubPointSelect.innerHTML = '<option value="" disabled selected>-- No Sub-points configured --</option>';
    sewaAssignSubPointSelect.disabled = true;
  }
});

// Populate Sewa District Dropdown
function populateSewaDistrictDropdown() {
  // Filters users strictly belonging to the active sewa state!
  const stateUsers = allUsers.filter(u => u.state === currentSewaState);
  const uniqueDistricts = [...new Set(stateUsers.map(u => u.district).filter(Boolean))].sort();
  
  sewaDistrictDropdown.innerHTML = '';
  sewaSelectedDistricts = [];
  sewaDistrictSelectedText.textContent = '-- Choose District(s) --';
  
  if (uniqueDistricts.length === 0) {
    sewaDistrictDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">No districts found for this state</div>';
    populateSewaCityDropdown();
    return;
  }
  
  uniqueDistricts.forEach(district => {
    const option = document.createElement('div');
    option.className = 'multiselect-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = district;
    checkbox.id = `sewa_dist_${district.replace(/\s+/g, '_')}`;
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = district;
    label.style.cursor = 'pointer';
    label.style.flexGrow = '1';
    
    option.appendChild(checkbox);
    option.appendChild(label);
    sewaDistrictDropdown.appendChild(option);
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        sewaSelectedDistricts.push(district);
      } else {
        sewaSelectedDistricts = sewaSelectedDistricts.filter(d => d !== district);
      }
      
      if (sewaSelectedDistricts.length === 0) {
        sewaDistrictSelectedText.textContent = '-- Choose District(s) --';
      } else if (sewaSelectedDistricts.length <= 2) {
        sewaDistrictSelectedText.textContent = sewaSelectedDistricts.join(', ');
      } else {
        sewaDistrictSelectedText.textContent = `${sewaSelectedDistricts.length} Districts Selected`;
      }
      
      populateSewaCityDropdown();
    });
  });
}

// Populate Sewa City Dropdown
function populateSewaCityDropdown() {
  sewaCityDropdown.innerHTML = '';
  sewaSelectedCities = [];
  sewaCitySelectedText.textContent = '-- Choose City/Cities --';
  
  if (sewaSelectedDistricts.length === 0) {
    sewaCityDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">Select district first</div>';
    renderSewaMatchingUsers();
    return;
  }
  
  const filteredUsers = allUsers.filter(u => u.state === currentSewaState && sewaSelectedDistricts.includes(u.district));
  const uniqueCities = [...new Set(filteredUsers.map(u => u.city).filter(Boolean))].sort();
  
  if (uniqueCities.length === 0) {
    sewaCityDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.9rem;">No cities found</div>';
    renderSewaMatchingUsers();
    return;
  }
  
  uniqueCities.forEach(city => {
    const option = document.createElement('div');
    option.className = 'multiselect-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = city;
    checkbox.id = `sewa_city_${city.replace(/\s+/g, '_')}`;
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = city;
    label.style.cursor = 'pointer';
    label.style.flexGrow = '1';
    
    option.appendChild(checkbox);
    option.appendChild(label);
    sewaCityDropdown.appendChild(option);
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        sewaSelectedCities.push(city);
      } else {
        sewaSelectedCities = sewaSelectedCities.filter(c => c !== city);
      }
      
      if (sewaSelectedCities.length === 0) {
        sewaCitySelectedText.textContent = '-- Choose City/Cities --';
      } else if (sewaSelectedCities.length <= 2) {
        sewaCitySelectedText.textContent = sewaSelectedCities.join(', ');
      } else {
        sewaCitySelectedText.textContent = `${sewaSelectedCities.length} Cities Selected`;
      }
      
      renderSewaMatchingUsers();
    });
  });
}

// Render matching users for Sewa period
function renderSewaMatchingUsers() {
  sewaMatchingUsersList.innerHTML = '';
  sewaSelectAllMatchingUsers.checked = true;
  
  if (sewaSelectedDistricts.length === 0) {
    sewaMatchingUsersList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          Please configure location filters to see matching staff.
        </td>
      </tr>
    `;
    return;
  }
  
  const matched = allUsers.filter(u => {
    const stateMatch = u.state === currentSewaState;
    if (!stateMatch) return false;
    
    const districtMatch = sewaSelectedDistricts.includes(u.district);
    if (!districtMatch) return false;
    
    if (sewaSelectedCities.length > 0) {
      return sewaSelectedCities.includes(u.city);
    }
    return true;
  });
  
  if (matched.length === 0) {
    sewaMatchingUsersList.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">
          No users found in the selected location(s).
        </td>
      </tr>
    `;
    return;
  }
  
  matched.forEach(user => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--glass-border)';
    
    const age = calculateAge(user.date_of_birth);
    
    row.innerHTML = `
      <td style="padding: 10px 12px; vertical-align: middle;">
        <input type="checkbox" class="sewa-matching-user-checkbox" value="${user.id}" checked style="width: 16px; height: 16px; accent-color: var(--accent-purple); cursor: pointer;">
      </td>
      <td style="padding: 10px 12px; font-weight: 500; color: var(--text-primary); vertical-align: middle;">
        ${user.full_name} <span style="font-size:0.75rem; color: var(--text-muted); display:block;">${user.sai_connect_id}</span>
      </td>
      <td style="padding: 10px 12px; vertical-align: middle;">${age} yrs</td>
      <td style="padding: 10px 12px; color: var(--text-secondary); vertical-align: middle;">
        ${user.district}, ${user.city}
      </td>
    `;
    sewaMatchingUsersList.appendChild(row);
  });
}

// Master checkbox toggle for Sewa matching users list
if (sewaSelectAllMatchingUsers) {
  sewaSelectAllMatchingUsers.addEventListener('change', function() {
    const checkboxes = sewaMatchingUsersList.querySelectorAll('.sewa-matching-user-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = sewaSelectAllMatchingUsers.checked;
    });
  });
}

// Render assignments log filtered for this sewa period
function filterAndRenderSewaAssignments() {
  if (!currentSewaState || !currentSewaStartDate || !currentSewaEndDate) return;

  const filtered = allAssignments.filter(assign => {
    return assign.sewa_state === currentSewaState && 
           assign.sewa_start_date === currentSewaStartDate && 
           assign.sewa_end_date === currentSewaEndDate;
  });

  renderSewaAssignments(filtered);
}

function renderSewaAssignments(assignments) {
  sewaAssignmentsTableBody.innerHTML = '';
  sewaSelectAllAssignments.checked = false;
  sewaBulkUnassignBtn.style.display = 'none';

  if (assignments.length === 0) {
    sewaAssignmentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
          No active duty assignments for this sewa period.
        </td>
      </tr>
    `;
    return;
  }

  assignments.forEach(assign => {
    const row = document.createElement('tr');
    const userName = assign.user ? assign.user.full_name : 'Unknown User';
    const userSaiId = assign.user ? assign.user.sai_connect_id : 'N/A';
    const userCity = assign.user ? `${assign.user.city}, ${assign.user.state}` : 'N/A';
    const mainPoint = assign.duty_point ? assign.duty_point.main_point : 'Unknown Point';
    const assignedDate = new Date(assign.assigned_at).toLocaleDateString() + ' ' + new Date(assign.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <td style="padding: 12px; vertical-align: middle;">
        <input type="checkbox" class="sewa-assignment-row-checkbox" value="${assign.id}" style="width: 16px; height: 16px; accent-color: var(--accent-purple); cursor: pointer;">
      </td>
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
        <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;" onclick="removeSewaAssignment('${assign.id}')">
          <span>Unassign</span>
        </button>
      </td>
    `;
    sewaAssignmentsTableBody.appendChild(row);
    
    // Bind change listener to checkboxes
    row.querySelector('.sewa-assignment-row-checkbox').addEventListener('change', updateSewaBulkUnassignButtonState);
  });
}

// Bulk unassign state updater for Sewa
function updateSewaBulkUnassignButtonState() {
  const checkboxes = sewaAssignmentsTableBody.querySelectorAll('.sewa-assignment-row-checkbox');
  const checkedBoxes = sewaAssignmentsTableBody.querySelectorAll('.sewa-assignment-row-checkbox:checked');
  
  if (checkedBoxes.length > 0) {
    sewaBulkUnassignBtn.style.display = 'inline-flex';
    sewaBulkUnassignBtn.querySelector('span').textContent = `Unassign Selected (${checkedBoxes.length})`;
  } else {
    sewaBulkUnassignBtn.style.display = 'none';
  }
  
  if (checkboxes.length > 0 && checkedBoxes.length === checkboxes.length) {
    sewaSelectAllAssignments.checked = true;
  } else {
    sewaSelectAllAssignments.checked = false;
  }
}

// Sewa select all assignments handler
if (sewaSelectAllAssignments) {
  sewaSelectAllAssignments.addEventListener('change', function() {
    const checkboxes = sewaAssignmentsTableBody.querySelectorAll('.sewa-assignment-row-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = sewaSelectAllAssignments.checked;
    });
    updateSewaBulkUnassignButtonState();
  });
}

// Single unassign handler for Sewa tab
window.removeSewaAssignment = async function(id) {
  if (!confirm('Are you sure you want to end this duty allocation?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      showToast('Assignment ended', 'success');
      // Fetch assignments to keep all tab lists fully synchronized
      await fetchAssignments();
      filterAndRenderSewaAssignments();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to remove assignment', 'error');
    }
  } catch (error) {
    showToast('Connection error during deletion', 'error');
  }
};

// Bulk unassign handler for Sewa tab
if (sewaBulkUnassignBtn) {
  sewaBulkUnassignBtn.addEventListener('click', async () => {
    const checkedBoxes = sewaAssignmentsTableBody.querySelectorAll('.sewa-assignment-row-checkbox:checked');
    const assignmentIds = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (assignmentIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to end duty allocations for these ${assignmentIds.length} staff members?`)) return;
    
    try {
      showToast(`Ending allocations for ${assignmentIds.length} staff...`, 'info');
      
      const unassignPromises = assignmentIds.map(id => {
        return fetch(`${API_BASE_URL}/assignments/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
      });
      
      const results = await Promise.all(unassignPromises);
      
      let successCount = 0;
      for (let r of results) {
        if (r.ok) successCount++;
      }
      
      if (successCount > 0) {
        showToast(`Successfully ended ${successCount} duty allocations!`, 'success');
        sewaSelectAllAssignments.checked = false;
        sewaBulkUnassignBtn.style.display = 'none';
        await fetchAssignments();
        filterAndRenderSewaAssignments();
      } else {
        showToast('Failed to end allocations', 'error');
      }
    } catch (error) {
      console.error('Bulk unassign error:', error);
      showToast('Failed to connect to the backend server', 'error');
    }
  });
}

// Submit assignment under the active Sewa batch
if (sewaAssignUserForm) {
  sewaAssignUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const dutyPointId = sewaAssignDutyPointSelect.value;
  const assignedSubPoint = sewaAssignSubPointSelect.value;
  
  if (!dutyPointId || !assignedSubPoint) {
    showToast('Please select duty point and sub-point', 'error');
    return;
  }
  
  const checkboxes = sewaMatchingUsersList.querySelectorAll('.sewa-matching-user-checkbox:checked');
  const userIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (userIds.length === 0) {
    showToast('Please select at least one staff member from the matching list', 'error');
    return;
  }
  
  // Check if any of the selected users are already assigned to a duty point during this Sewa batch
  const alreadyAssigned = [];
  userIds.forEach(userId => {
    const existing = allAssignments.find(a => 
      a.user_id === userId &&
      a.sewa_state === currentSewaState &&
      a.sewa_start_date === currentSewaStartDate &&
      a.sewa_end_date === currentSewaEndDate
    );
    if (existing) {
      alreadyAssigned.push({
        id: existing.id,
        userId: userId,
        userName: existing.user ? existing.user.full_name : 'Unknown User',
        mainPoint: existing.duty_point ? existing.duty_point.main_point : 'Unknown Point',
        subPoint: existing.assigned_sub_point,
        sewa_start_date: currentSewaStartDate,
        sewa_end_date: currentSewaEndDate,
        sewa_state: currentSewaState
      });
    }
  });

  if (alreadyAssigned.length > 0) {
    openReassignModal(alreadyAssigned);
    return;
  }
  
  try {
    showToast(`Assigning ${userIds.length} staff members to duty...`, 'info');
    
    const assignmentPromises = userIds.map(userId => {
      return fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ 
          userId, 
          dutyPointId, 
          assignedSubPoint,
          sewaStartDate: currentSewaStartDate,
          sewaEndDate: currentSewaEndDate,
          sewaState: currentSewaState
        })
      });
    });
    
    const results = await Promise.all(assignmentPromises);
    
    let successCount = 0;
    for (let r of results) {
      if (r.ok) successCount++;
    }
    
    if (successCount > 0) {
      showToast(`Successfully assigned ${successCount} staff to duty!`, 'success');
      
      sewaSelectedDistricts = [];
      sewaSelectedCities = [];
      sewaDistrictDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      sewaCityDropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      sewaDistrictSelectedText.textContent = '-- Choose District(s) --';
      sewaCitySelectedText.textContent = '-- Choose City/Cities --';
      
      sewaAssignUserForm.reset();
      sewaAssignSubPointSelect.disabled = true;
      sewaAssignSubPointSelect.innerHTML = '<option value="" disabled selected>-- Select Main Point First --</option>';
      sewaMatchingUsersList.innerHTML = '';
      
      await fetchAssignments();
      filterAndRenderSewaAssignments();
    } else {
      showToast('Failed to assign selected staff. Check if they are already assigned.', 'error');
    }
  } catch (error) {
    console.error('Batch assignment error:', error);
    showToast('Failed to connect to the backend server', 'error');
  }
});
}

// APP INITIALIZATION
function bootApp() {
  // Initialize modular Location Selector components
  userLocationSelector = new LocationSelector({
    container: document.getElementById('addUserLocationComponentContainer'),
    multiSelect: false
  });
  
  assignmentsLocationSelector = new LocationSelector({
    container: document.getElementById('assignmentsLocationComponentContainer'),
    multiSelect: true,
    onStateChange: () => {
      renderMatchingUsers();
    },
    onDistrictChange: () => {
      renderMatchingUsers();
    },
    onCityChange: () => {
      renderMatchingUsers();
    }
  });

  lucide.createIcons();
  initializeLocationDropdowns();
  checkAuth();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
