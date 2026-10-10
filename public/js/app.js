// DriveEase - Main Application Controller, Router & Global Modals

const App = {
  pendingAction: null,

  async init() {
    this.applyTheme(State.theme);
    this.bindGlobalEvents();

    // Verify session
    if (State.token) {
      const verified = await AuthAPI.getMe();
      if (!verified) {
        State.token = null;
        State.user = null;
        localStorage.removeItem('driveease_token');
        localStorage.removeItem('driveease_user');
      }
    } else {
      State.token = null;
      State.user = null;
      localStorage.removeItem('driveease_token');
      localStorage.removeItem('driveease_user');
    }

    // Handle routing
    window.addEventListener('hashchange', () => this.render());
    this.render();

    // Initialize landing page
    if (typeof Landing !== 'undefined') Landing.init();

    // Initialize Google Identity Services
    this.initGoogleAuth();
  },

  applyTheme(theme) {
    State.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('driveease_theme', theme);
    this.renderGoogleButtons();
  },

  toggleTheme() {
    const newTheme = State.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    showToast('Theme Changed', `Switched to ${newTheme} mode.`, 'info');
    if (window.location.hash.includes('dashboard')) {
      this.render();
    }
  },

  bindGlobalEvents() {
    // Keyboard Shortcut Ctrl + K for Spotlight Search
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSpotlightSearch();
      }
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Spotlight Input live filter
    const spotInput = document.getElementById('spotlight-search-input');
    if (spotInput) {
      spotInput.addEventListener('input', (e) => this.handleSpotlightSearch(e.target.value));
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  },

  openSpotlightSearch() {
    const modal = document.getElementById('spotlight-search-modal');
    if (modal) {
      modal.classList.add('active');
      const input = document.getElementById('spotlight-search-input');
      if (input) {
        input.value = '';
        input.focus();
        this.handleSpotlightSearch('');
      }
    }
  },

  closeSpotlightSearch() {
    const modal = document.getElementById('spotlight-search-modal');
    if (modal) modal.classList.remove('active');
  },

  async handleSpotlightSearch(query) {
    const resultsContainer = document.getElementById('spotlight-results-container');
    if (!resultsContainer) return;

    const q = query.toLowerCase().trim();
    const cars = State.cachedCars.length > 0 ? State.cachedCars : await CarsAPI.getAll();

    const matchedCars = cars.filter(c => c.name.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)).slice(0, 4);

    const pages = [
      { name: 'Browse Fleet', hash: '#browse', icon: '🚘', action: () => { window.location.hash = '#browse'; } },
      { name: 'Why DriveEase', hash: '#why-us', icon: '🛡️', action: () => Landing.scrollToSection('why-us') },
      { name: 'How It Works', hash: '#how-it-works', icon: '⚡', action: () => Landing.scrollToSection('how-it-works') },
      { name: 'Exclusive Offers', hash: '#offers', icon: '🏷️', action: () => Landing.scrollToSection('offers') },
      { name: 'Customer Reviews', hash: '#reviews', icon: '⭐', action: () => Landing.scrollToSection('reviews') },
      { name: 'Customer Portal Dashboard', hash: '#user-dashboard', icon: '👤', action: () => { window.location.hash = '#user-dashboard'; } },
      { name: 'My Bookings & Invoices', hash: '#user-bookings', icon: '📅', action: () => { window.location.hash = '#user-bookings'; } },
      { name: 'Admin Operations Portal', hash: '#admin-dashboard', icon: '👑', action: () => { window.location.hash = '#admin-dashboard'; } }
    ].filter(p => p.name.toLowerCase().includes(q));

    resultsContainer.innerHTML = `
      ${matchedCars.length > 0 ? `
        <div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px 16px; text-transform: uppercase;">Vehicles</div>
        ${matchedCars.map(c => `
          <div class="spotlight-item" onclick="App.closeSpotlightSearch(); Browse.openCarDetails('${c.id}');">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${c.image}" style="width: 40px; height: 26px; border-radius: 4px; object-fit: cover;" />
              <div>
                <strong style="font-size: 0.9rem;">${c.name}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${c.type} • ${c.transmission}</div>
              </div>
            </div>
            <span style="color: var(--cyan); font-weight: 800;">${formatCurrency(c.pricePerDay)}/d</span>
          </div>
        `).join('')}
      ` : ''}

      ${pages.length > 0 ? `
        <div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px 16px; text-transform: uppercase; margin-top: 8px;">Navigation & Actions</div>
        ${pages.map(p => `
          <div class="spotlight-item" onclick="App.closeSpotlightSearch(); window.location.hash='${p.hash}';">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span>${p.icon}</span>
              <strong style="font-size: 0.88rem;">${p.name}</strong>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Jump ➔</span>
          </div>
        `).join('')}
      ` : ''}

      ${matchedCars.length === 0 && pages.length === 0 ? `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">No matching cars or pages found.</div>
      ` : ''}
    `;
  },

  // Auth Modal & Quick Fill Handlers
  openAuthModal(tab = 'signin') {
    this.switchAuthTab(tab);
    openModal('auth-modal');
    this.renderGoogleButtons();
  },

  switchAuthTab(tab) {
    const signinTab = document.getElementById('tab-signin-btn');
    const signupTab = document.getElementById('tab-signup-btn');
    const signinForm = document.getElementById('signin-form-box');
    const signupForm = document.getElementById('signup-form-box');

    if (tab === 'signin') {
      if (signinTab) signinTab.classList.add('active');
      if (signupTab) signupTab.classList.remove('active');
      if (signinForm) signinForm.style.display = 'block';
      if (signupForm) signupForm.style.display = 'none';
    } else {
      if (signinTab) signinTab.classList.remove('active');
      if (signupTab) signupTab.classList.add('active');
      if (signinForm) signinForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
    }
    this.renderGoogleButtons();
  },

  async initGoogleAuth() {
    try {
      const config = await AuthAPI.getConfig();
      if (!config || !config.googleClientId) return;

      const clientId = config.googleClientId;
      this.googleClientId = clientId;

      const initializeGsi = () => {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
          setTimeout(initializeGsi, 250);
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => this.handleGoogleCredentialResponse(response),
          auto_select: false,
          cancel_on_tap_outside: true
        });

        this.renderGoogleButtons();
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initializeGsi();
      } else {
        window.addEventListener('DOMContentLoaded', initializeGsi);
      }
    } catch (err) {
      console.warn('Google Identity Services setup notice:', err.message);
    }
  },

  renderGoogleButtons() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) return;

    const theme = State.theme === 'light' ? 'outline' : 'filled_black';

    const signinContainer = document.getElementById('g_id_signin_container');
    if (signinContainer) {
      signinContainer.innerHTML = '';
      try {
        google.accounts.id.renderButton(signinContainer, {
          type: 'standard',
          shape: 'pill',
          theme: theme,
          text: 'signin_with',
          size: 'large',
          logo_alignment: 'left',
          width: 280
        });
      } catch (e) {}
    }

    const signupContainer = document.getElementById('g_id_signup_container');
    if (signupContainer) {
      signupContainer.innerHTML = '';
      try {
        google.accounts.id.renderButton(signupContainer, {
          type: 'standard',
          shape: 'pill',
          theme: theme,
          text: 'signup_with',
          size: 'large',
          logo_alignment: 'left',
          width: 280
        });
      } catch (e) {}
    }
  },

  async handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showToast('Google Sign-In', 'No credential received from Google.', 'error');
      return;
    }

    try {
      const res = await AuthAPI.loginGoogle(response.credential);
      closeModal('auth-modal');
      showToast('Welcome!', `Signed in with Google as ${res.user.name}`, 'success');

      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        if (action.type === 'booking') {
          Booking.startBooking(action.carId);
          return;
        } else if (action.type === 'favourite') {
          const btn = document.querySelector(`.fav-btn[data-car-id="${action.carId}"]`);
          Browse.handleToggleFav(action.carId, btn || document.body);
          return;
        }
      }

      window.location.hash = '#user-dashboard';
      this.render();
    } catch (err) {
      showToast('Google Sign-In Failed', err.message, 'error');
    }
  },

  fillDemoAdmin() {
    document.getElementById('auth-signin-email').value = 'admin@driveease.com';
    document.getElementById('auth-signin-pass').value = 'admin123';
    showToast('Admin Credentials Filled', 'admin@driveease.com', 'info');
  },

  fillDemoCustomer() {
    document.getElementById('auth-signin-email').value = 'john.doe@example.com';
    document.getElementById('auth-signin-pass').value = 'john123';
    showToast('Customer Credentials Filled', 'john.doe@example.com (John Doe)', 'info');
  },

  async handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('auth-signin-email')?.value?.trim();
    const password = document.getElementById('auth-signin-pass')?.value;

    try {
      const res = await AuthAPI.login(email, password);
      closeModal('auth-modal');
      showToast('Welcome Back!', `Signed in as ${res.user.name}`, 'success');

      // Check for pending actions
      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        if (action.type === 'booking') {
          Booking.startBooking(action.carId);
          return;
        } else if (action.type === 'favourite') {
          const btn = document.querySelector(`.fav-btn[data-car-id="${action.carId}"]`);
          Browse.handleToggleFav(action.carId, btn || document.body);
          return;
        }
      }

      // Redirect based on role
      if (res.user.role === 'ADMIN') {
        window.location.hash = '#admin-dashboard';
      } else {
        window.location.hash = '#user-dashboard';
      }
      this.render();
    } catch (err) {
      showToast('Sign In Failed', err.message, 'error');
    }
  },

  async handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('auth-signup-name')?.value?.trim();
    const email = document.getElementById('auth-signup-email')?.value?.trim();
    const phone = document.getElementById('auth-signup-phone')?.value?.trim();
    const password = document.getElementById('auth-signup-pass')?.value;
    const role = document.getElementById('auth-signup-role')?.value || 'CUSTOMER';

    try {
      const res = await AuthAPI.register({ name, email, phone, password, role });
      closeModal('auth-modal');
      showToast('Account Created!', `Welcome to DriveEase, ${res.user.name}!`, 'success');

      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        if (action.type === 'booking') {
          Booking.startBooking(action.carId);
          return;
        } else if (action.type === 'favourite') {
          const btn = document.querySelector(`.fav-btn[data-car-id="${action.carId}"]`);
          Browse.handleToggleFav(action.carId, btn || document.body);
          return;
        }
      }

      if (res.user.role === 'ADMIN') {
        window.location.hash = '#admin-dashboard';
      } else {
        window.location.hash = '#user-dashboard';
      }
      this.render();
    } catch (err) {
      showToast('Registration Failed', err.message, 'error');
    }
  },

  // SPA Navigation Helper
  navigateTo(hash) {
    if (window.location.hash === hash) {
      this.render();
    } else {
      window.location.hash = hash;
    }
  },

  // Main Single Page Routing & View Switcher
  render() {
    let hash = window.location.hash || '#home';
    if (!hash || hash === '#' || hash === '') {
      hash = '#home';
    }
    const publicView = document.getElementById('view-public');
    const homeSection = document.getElementById('public-home-section');
    const browseSection = document.getElementById('public-browse-section');
    const userDashView = document.getElementById('view-user-dash');
    const adminDashView = document.getElementById('view-admin-dash');

    // Update public navbar buttons (Always display Login button on public homepage)
    const authNavBtn = document.getElementById('public-nav-auth-btn');
    const authContainer = document.getElementById('public-nav-auth-container');
    if (authNavBtn) {
      authNavBtn.className = 'btn btn-primary btn-sm';
      authNavBtn.innerHTML = `Login`;
      authNavBtn.onclick = () => App.openAuthModal('signin');
    } else if (authContainer) {
      authContainer.innerHTML = `
        <button id="public-nav-auth-btn" class="btn btn-primary btn-sm" onclick="App.openAuthModal('signin')">
          Login
        </button>
      `;
    }

    // Route logic
    if (hash.startsWith('#admin-') || hash === '#admin') {
      if (!State.token || !State.user || State.user.role !== 'ADMIN') {
        showToast('Admin Access Required', 'Please log in with administrator credentials.', 'warning');
        this.openAuthModal('signin');
        this.fillDemoAdmin();
        window.location.hash = '#home';
        return;
      }

      if (publicView) publicView.style.display = 'none';
      if (userDashView) userDashView.style.display = 'none';
      if (adminDashView) adminDashView.style.display = 'flex';

      const subView = hash === '#admin' ? 'overview' : hash.replace('#admin-', '');
      AdminDash.init(subView);
    } else if (hash.startsWith('#user-') || hash === '#user') {
      if (!State.token || !State.user) {
        showToast('Authentication Required', 'Please log in to access your dashboard.', 'info');
        this.openAuthModal('signin');
        this.fillDemoCustomer();
        window.location.hash = '#home';
        return;
      }

      if (publicView) publicView.style.display = 'none';
      if (adminDashView) adminDashView.style.display = 'none';
      if (userDashView) userDashView.style.display = 'flex';

      const subView = hash.replace('#user-', '');
      UserDash.init(subView);
    } else if (hash === '#browse' || hash === '#fleet') {
      // DEDICATED BROWSE FLEET VIEW (Step 2)
      if (userDashView) userDashView.style.display = 'none';
      if (adminDashView) adminDashView.style.display = 'none';
      if (publicView) publicView.style.display = 'block';
      if (homeSection) homeSection.style.display = 'none';
      if (browseSection) browseSection.style.display = 'block';
      const carDetailsSection = document.getElementById('public-car-details-section');
      if (carDetailsSection) carDetailsSection.style.display = 'none';

      // Update Nav Link Active states
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === '#browse');
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof Browse !== 'undefined') {
        Browse.init();
      }
    } else if (hash.startsWith('#car/') || hash.startsWith('#car-details/')) {
      // DEDICATED CAR DETAILS VIEW (Step 3)
      if (userDashView) userDashView.style.display = 'none';
      if (adminDashView) adminDashView.style.display = 'none';
      if (publicView) publicView.style.display = 'block';
      if (homeSection) homeSection.style.display = 'none';
      if (browseSection) browseSection.style.display = 'none';
      const carDetailsSection = document.getElementById('public-car-details-section');
      if (carDetailsSection) carDetailsSection.style.display = 'block';

      // Update Nav Link Active states (Browse Cars active)
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === '#browse');
      });

      const carId = hash.replace(/#(?:car|car-details)\//, '').trim();
      if (typeof CarDetails !== 'undefined') {
        CarDetails.init(carId);
      }
    } else {
      // PUBLIC HOME / LANDING VIEW
      if (userDashView) userDashView.style.display = 'none';
      if (adminDashView) adminDashView.style.display = 'none';
      if (publicView) publicView.style.display = 'block';
      if (homeSection) homeSection.style.display = 'block';
      if (browseSection) browseSection.style.display = 'none';
      const carDetailsSection = document.getElementById('public-car-details-section');
      if (carDetailsSection) carDetailsSection.style.display = 'none';

      // Update Nav Link Active states
      document.querySelectorAll('.nav-link').forEach(l => {
        const h = l.getAttribute('href') || '';
        l.classList.toggle('active', (hash === '#home' && h === '#home') || (hash !== '#home' && h === hash));
      });

      if (hash === '#home' || !hash) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === '#why-us') {
        setTimeout(() => { if (typeof Landing !== 'undefined') Landing.scrollToSection('why-us'); }, 50);
      } else if (hash === '#how-it-works') {
        setTimeout(() => { if (typeof Landing !== 'undefined') Landing.scrollToSection('how-it-works'); }, 50);
      } else if (hash === '#offers') {
        setTimeout(() => { if (typeof Landing !== 'undefined') Landing.scrollToSection('offers'); }, 50);
      } else if (hash === '#reviews') {
        setTimeout(() => { if (typeof Landing !== 'undefined') Landing.scrollToSection('reviews'); }, 50);
      } else if (hash === '#faq') {
        setTimeout(() => { if (typeof Landing !== 'undefined') Landing.scrollToSection('faq'); }, 50);
      }
    }
  }
};

// Initialize App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
