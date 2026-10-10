const initialToken = localStorage.getItem('driveease_token') || null;
const initialUserStr = localStorage.getItem('driveease_user');
let initialUser = null;
if (initialToken && initialUserStr) {
  try {
    initialUser = JSON.parse(initialUserStr);
  } catch (e) {
    initialUser = null;
  }
} else if (!initialToken && initialUserStr) {
  // Purge orphan user record without valid token
  try { localStorage.removeItem('driveease_user'); } catch (e) {}
}

const State = {
  token: initialToken,
  user: initialUser,
  theme: localStorage.getItem('driveease_theme') || 'dark',
  currentView: 'home',
  compareList: JSON.parse(localStorage.getItem('driveease_compare') || '[]'),
  cachedCars: []
};

function isAuthenticated() {
  return Boolean(State.token && State.user);
}

function isAdmin() {
  return Boolean(State.token && State.user && State.user.role === 'ADMIN');
}

// API Base Request Helper
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (State.token) {
    headers['Authorization'] = `Bearer ${State.token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// Toast Notification Manager
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-close" onclick="this.parentElement.remove()">✕</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Currency, Number & Date Formatters
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

function formatNumber(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toISODateString(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeISODate(val, fallbackDate) {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const d = new Date(val.trim());
    if (!isNaN(d.getTime())) return val.trim();
  }
  if (typeof val === 'string') {
    const dmyMatch = val.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  return toISODateString(fallbackDate);
}

// Authentication API
const AuthAPI = {
  async register(data) {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    State.token = res.token;
    State.user = res.user;
    localStorage.setItem('driveease_token', res.token);
    localStorage.setItem('driveease_user', JSON.stringify(res.user));
    return res;
  },

  async login(email, password) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    State.token = res.token;
    State.user = res.user;
    localStorage.setItem('driveease_token', res.token);
    localStorage.setItem('driveease_user', JSON.stringify(res.user));
    return res;
  },

  async loginGoogle(credential) {
    const res = await apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
    State.token = res.token;
    State.user = res.user;
    localStorage.setItem('driveease_token', res.token);
    localStorage.setItem('driveease_user', JSON.stringify(res.user));
    return res;
  },

  async getConfig() {
    return await apiRequest('/api/auth/config');
  },

  logout() {
    State.token = null;
    State.user = null;
    localStorage.removeItem('driveease_token');
    localStorage.removeItem('driveease_user');
    showToast('Logged Out', 'You have been safely signed out.', 'info');
    window.location.hash = '#home';
    App.render();
  },

  async getMe() {
    if (!State.token) return null;
    try {
      const res = await apiRequest('/api/auth/me');
      State.user = res.user;
      localStorage.setItem('driveease_user', JSON.stringify(res.user));
      return res.user;
    } catch {
      State.token = null;
      State.user = null;
      localStorage.removeItem('driveease_token');
      localStorage.removeItem('driveease_user');
      return null;
    }
  },

  async updateProfile(data) {
    const res = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    State.user = res.user;
    localStorage.setItem('driveease_user', JSON.stringify(res.user));
    return res;
  },

  async updatePassword(currentPassword, newPassword) {
    return await apiRequest('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  async getPreferences() {
    if (!State.token) return null;
    return await apiRequest('/api/auth/preferences');
  },

  async updatePreferences(preferences) {
    const res = await apiRequest('/api/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
    if (res.user) {
      State.user = res.user;
      localStorage.setItem('driveease_user', JSON.stringify(res.user));
    }
    return res;
  }
};

// Cars API
const CarsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    const cars = await apiRequest(`/api/cars${query ? `?${query}` : ''}`);
    State.cachedCars = cars;
    return cars;
  },

  async getById(id) {
    return await apiRequest(`/api/cars/${id}`);
  },

  async create(data) {
    return await apiRequest('/api/cars', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id, data) {
    return await apiRequest(`/api/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updateStatus(id, status) {
    return await apiRequest(`/api/cars/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async delete(id) {
    return await apiRequest(`/api/cars/${id}`, {
      method: 'DELETE'
    });
  }
};

// Bookings API
const BookingsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await apiRequest(`/api/bookings${query ? `?${query}` : ''}`);
  },

  async getById(id) {
    return await apiRequest(`/api/bookings/${id}`);
  },

  async create(data) {
    return await apiRequest('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cancel(id) {
    return await apiRequest(`/api/bookings/${id}/cancel`, {
      method: 'PUT'
    });
  },

  async updateStatus(id, data) {
    return await apiRequest(`/api/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// Payments API
const PaymentsAPI = {
  async getAll() {
    return await apiRequest('/api/payments');
  },

  async process(data) {
    return await apiRequest('/api/payments/process', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// Favourites API
const FavouritesAPI = {
  async getAll() {
    return await apiRequest('/api/favourites');
  },

  async toggle(carId) {
    return await apiRequest(`/api/favourites/toggle/${carId}`, {
      method: 'POST'
    });
  }
};

// Reviews API
const ReviewsAPI = {
  async getCarReviews(carId) {
    return await apiRequest(`/api/reviews/car/${carId}`);
  },

  async getAll() {
    return await apiRequest('/api/reviews/all');
  },

  async getMy() {
    return await apiRequest('/api/reviews/my');
  },

  async submit(data) {
    return await apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async moderate(id, status) {
    return await apiRequest(`/api/reviews/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async delete(id) {
    return await apiRequest(`/api/reviews/${id}`, {
      method: 'DELETE'
    });
  }
};

// Coupons API
const CouponsAPI = {
  async getAll() {
    return await apiRequest('/api/coupons');
  },

  async validate(code, amount) {
    return await apiRequest('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, amount })
    });
  },

  async create(data) {
    return await apiRequest('/api/coupons', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id, data) {
    return await apiRequest(`/api/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id) {
    return await apiRequest(`/api/coupons/${id}`, {
      method: 'DELETE'
    });
  }
};

// Expenses API
const ExpensesAPI = {
  async getAll() {
    return await apiRequest('/api/expenses');
  },

  async create(data) {
    return await apiRequest('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async delete(id) {
    return await apiRequest(`/api/expenses/${id}`, {
      method: 'DELETE'
    });
  }
};

// Notifications API
const NotificationsAPI = {
  async getAll() {
    return await apiRequest('/api/notifications');
  },

  async markRead(id) {
    return await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllRead() {
    return await apiRequest('/api/notifications/mark-all-read', { method: 'PUT' });
  },

  async clear(id) {
    return await apiRequest(`/api/notifications/${id}`, { method: 'DELETE' });
  }
};

// Activities API
const ActivitiesAPI = {
  async getAll() {
    return await apiRequest('/api/activities');
  }
};

// Analytics API
const AnalyticsAPI = {
  async getAdmin() {
    return await apiRequest('/api/analytics/admin');
  },

  async getUser() {
    return await apiRequest('/api/analytics/user');
  }
};

// Users API (Admin)
const UsersAPI = {
  async getAll() {
    return await apiRequest('/api/users');
  },

  async getById(id) {
    return await apiRequest(`/api/users/${id}`);
  },

  async create(data) {
    return await apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateStatus(id, status) {
    return await apiRequest(`/api/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }
};
