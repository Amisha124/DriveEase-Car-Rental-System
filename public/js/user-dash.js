// DriveEase - Premium Customer Dashboard Controller

const UserDash = {
  countdownInterval: null,
  activeBookingsTab: 'all',
  bookingSearchQuery: '',
  favSearchQuery: '',
  favActiveCategory: 'all',
  favAvailabilityOnly: false,
  favSortOption: 'default',
  paymentStatusFilter: 'all',
  paymentSearchQuery: '',
  paymentMethodFilter: 'all',
  reviewRatingFilter: 'all',
  reviewSearchQuery: '',
  reviewSortOption: 'newest',
  notifFilter: 'all',
  notifSearchQuery: '',
  notifSortOption: 'newest',

  async init(subView = 'overview') {
    if (!State.token || !State.user) {
      window.location.hash = '#home';
      App.openAuthModal('signin');
      return;
    }

    this.renderSidebar();
    this.renderHeader();
    this.updateNotificationBadge();

    const view = (subView || '').toLowerCase();

    if (view === 'overview' || view === 'dashboard' || view === '' || view === 'dash') {
      await this.renderOverview();
    } else if (view === 'bookings' || view === 'my-bookings') {
      await this.renderMyBookings();
    } else if (view === 'favourites' || view === 'saved') {
      await this.renderFavourites();
    } else if (view === 'payments' || view === 'transactions') {
      await this.renderPayments();
    } else if (view === 'notifications') {
      await this.renderNotifications();
    } else if (view === 'reviews') {
      await this.renderReviews();
    } else if (view === 'profile') {
      await this.renderProfile();
    } else if (view === 'settings') {
      await this.renderSettings();
    } else {
      await this.renderOverview();
    }

    // Auto-close mobile sidebar drawer on navigation
    const sidebar = document.getElementById('user-sidebar');
    if (sidebar) sidebar.classList.remove('open');
  },

  async updateNotificationBadge() {
    try {
      const res = await NotificationsAPI.getAll();
      const unreadCount = (res.notifications || []).filter(n => !n.read).length;
      
      const sideBadge = document.getElementById('user-notif-badge');
      if (sideBadge) {
        sideBadge.textContent = unreadCount;
        sideBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
      }

      const headerDot = document.getElementById('user-header-notif-dot');
      if (headerDot) {
        headerDot.style.display = unreadCount > 0 ? 'block' : 'none';
      }
    } catch {
      // Ignore background badge errors
    }
  },

  renderSidebar() {
    const sidebar = document.getElementById('user-sidebar');
    if (!sidebar) return;

    const currentHash = window.location.hash || '#user-dashboard';

    sidebar.innerHTML = `
      <div class="dash-brand">
        <div class="brand-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4"/></svg>
        </div>
        <div class="brand-info">
          <h2>DriveEase</h2>
          <span>Customer Portal</span>
        </div>
      </div>

      <div class="dash-nav">
        <div class="dash-nav-item ${currentHash === '#user-dashboard' || currentHash === '#user-dash' ? 'active' : ''}" onclick="App.navigateTo('#user-dashboard')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          </span>
          <span>Dashboard</span>
        </div>
        <div class="dash-nav-item" onclick="App.navigateTo('#browse')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </span>
          <span>Browse Fleet</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-bookings' ? 'active' : ''}" onclick="App.navigateTo('#user-bookings')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </span>
          <span>My Bookings</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-favourites' ? 'active' : ''}" onclick="App.navigateTo('#user-favourites')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </span>
          <span>Favourites</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-payments' ? 'active' : ''}" onclick="App.navigateTo('#user-payments')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          </span>
          <span>Payments</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-notifications' ? 'active' : ''}" onclick="App.navigateTo('#user-notifications')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </span>
          <span>Notifications</span>
          <span class="dash-nav-badge" id="user-notif-badge" style="display: none;">0</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-reviews' ? 'active' : ''}" onclick="App.navigateTo('#user-reviews')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </span>
          <span>Reviews & Ratings</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-profile' ? 'active' : ''}" onclick="App.navigateTo('#user-profile')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <span>My Profile</span>
        </div>
        <div class="dash-nav-item ${currentHash === '#user-settings' ? 'active' : ''}" onclick="App.navigateTo('#user-settings')">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          <span>Settings</span>
        </div>
        <div class="dash-nav-item dash-nav-logout" onclick="AuthAPI.logout()">
          <span class="dash-nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </span>
          <span>Logout</span>
        </div>
      </div>

      <!-- Support & Help Tile -->
      <div class="dash-sidebar-promo">
        <div class="promo-tag">
          <span class="badge-dot" style="background: var(--emerald); box-shadow: 0 0 6px var(--emerald);"></span>
          <span>Concierge & Support</span>
        </div>
        <div class="promo-title">24/7 Roadside Assistance and vehicle support is active.</div>
        <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 10px;" onclick="showToast('Customer Concierge', 'DriveEase customer support is active 24/7. Call: 1800-DRIVE-EASE', 'info')">
          Contact Concierge
        </button>
      </div>

      <div class="dash-sidebar-footer">
        <div class="sidebar-footer-content">
          <h4>Drive More • Explore More</h4>
          <p>Precision-engineered luxury fleet.</p>
        </div>
      </div>
    `;
  },

  renderHeader() {
    const header = document.getElementById('user-header');
    if (!header) return;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <button class="btn-icon mobile-menu-toggle" id="user-mobile-menu-btn" onclick="document.getElementById('user-sidebar').classList.toggle('open')" title="Toggle Menu">☰</button>
        <div class="dash-search-wrap" onclick="App.openSpotlightSearch()">
          <span class="search-icon-svg" style="color: var(--text-muted); display: flex; align-items: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="text" class="dash-search-input" placeholder="Search cars, bookings, or destinations..." readonly />
          <span class="search-shortcut-badge">Ctrl + K</span>
        </div>
      </div>

      <div class="dash-header-actions">
        <button class="btn-icon" onclick="App.toggleTheme()" title="Toggle Dark/Light Theme">
          ${State.theme === 'dark' ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          `}
        </button>
        <button class="btn-icon" style="position: relative;" onclick="App.navigateTo('#user-notifications')" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span id="user-header-notif-dot" style="display: none; position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; background: var(--rose); border-radius: 50%;"></span>
        </button>
        <div class="user-profile-pill" onclick="App.navigateTo('#user-profile')">
          <img src="${State.user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}" class="user-avatar" alt="${State.user?.name || 'User'}" />
          <div class="user-meta">
            <h4>${State.user?.name || 'Customer'}</h4>
            <span>${State.user?.membership || 'Customer'}</span>
          </div>
        </div>
      </div>
    `;
  },

  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  },

  // 1. DASHBOARD OVERVIEW (High-End Luxury Automotive Customer Portal)
  async renderOverview() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    container.innerHTML = `
      <div class="dash-content">
        <div class="skeleton" style="height: 190px; border-radius: var(--radius-xl); margin-bottom: 24px;"></div>
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <div class="skeleton" style="height: 140px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 140px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 140px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 140px; border-radius: var(--radius-lg);"></div>
        </div>
        <div class="mid-row-grid">
          <div class="skeleton" style="height: 300px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 300px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;

    try {
      const data = await AnalyticsAPI.getUser();
      const user = State.user || { name: 'Customer' };
      const greeting = this.getGreeting();

      const totalBookings = data.kpis?.totalBookings ?? 0;
      const activeRentals = (data.recentBookings || []).filter(b => b.bookingStatus === 'Active').length || (data.upcomingRental?.bookingStatus === 'Active' ? 1 : 0);
      const upcomingTrips = data.kpis?.upcomingBookingCount ?? (data.upcomingRental ? 1 : 0);
      const totalSpent = data.kpis?.totalSpent ?? 0;

      container.innerHTML = `
        <div class="dash-content">
          
          <!-- 1. LUXURY WELCOME HERO BANNER -->
          <div class="dash-hero-card">
            <div class="dash-hero-text">
              <div class="dash-hero-badge">
                <span class="badge-dot" style="background: var(--emerald); box-shadow: 0 0 6px var(--emerald);"></span>
                <span>Active Customer Portal</span>
              </div>
              <h1>${greeting}, ${user.name} 👋</h1>
              <p>Manage your reservations, active vehicle keys, and verified invoices in your luxury fleet portal.</p>
              <div class="dash-hero-actions">
                <button class="btn btn-primary" onclick="App.navigateTo('#browse')">
                  <span>Explore Cars</span>
                  <span style="font-size: 1.1rem; line-height: 1;">➔</span>
                </button>
                <button class="btn btn-secondary" onclick="App.navigateTo('#user-bookings')">
                  <span>My Bookings</span>
                </button>
              </div>
            </div>

            <div class="dash-hero-visual">
              <div class="hero-car-glow"></div>
              <img src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=900&auto=format&fit=crop&q=85" alt="DriveEase Performance Fleet" class="hero-car-img" />
            </div>
          </div>

          <!-- 2. REFINED 4 KPI CARDS (Real Authenticated Data) -->
          <div class="kpi-grid">
            
            <!-- 1. Total Bookings (Blue Accent) -->
            <div class="kpi-card kpi-card-blue glass-card" onclick="App.navigateTo('#user-bookings')" title="View all reservations">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span class="kpi-label">Total Bookings</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${totalBookings}</div>
                <div class="kpi-sub-badge badge-blue">All Reservations</div>
              </div>
            </div>

            <!-- 2. Active Rentals (Violet Accent) -->
            <div class="kpi-card kpi-card-purple glass-card" onclick="App.navigateTo('#user-bookings')" title="View active rentals">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                </div>
                <span class="kpi-label">Active Rentals</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${activeRentals}</div>
                <div class="kpi-sub-badge badge-purple">Currently On Road</div>
              </div>
            </div>

            <!-- 3. Upcoming Trips (Amber Accent) -->
            <div class="kpi-card kpi-card-orange glass-card" onclick="App.navigateTo('#user-bookings')" title="View upcoming trips">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span class="kpi-label">Upcoming Trips</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${upcomingTrips}</div>
                <div class="kpi-sub-badge badge-orange">Scheduled Departures</div>
              </div>
            </div>

            <!-- 4. Total Spent (Emerald Accent) -->
            <div class="kpi-card kpi-card-emerald glass-card" onclick="App.navigateTo('#user-payments')" title="View payment invoices">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-emerald">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </div>
                <span class="kpi-label">Total Spent</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${formatCurrency(totalSpent)}</div>
                <div class="kpi-sub-badge badge-emerald">Verified Invoices</div>
              </div>
            </div>

          </div>

          <!-- 3. MIDDLE ROW: UPCOMING TRIP (1.55fr) + QUICK ACTIONS & PROFILE (1fr) -->
          <div class="mid-row-grid">
            
            <!-- UPCOMING RENTAL FEATURE CARD -->
            <div class="rental-widget glass-card">
              <div class="widget-title-row">
                <div class="widget-title">
                  <span class="widget-title-icon-wrap" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  </span>
                  <span>Upcoming Trip</span>
                </div>
                <span class="view-all-link" onclick="App.navigateTo('#user-bookings')">View All Reservations ➔</span>
              </div>

              ${data.upcomingRental ? `
                <div class="upcoming-rental-content">
                  <img src="${data.upcomingRental.carImage}" alt="${data.upcomingRental.carName}" class="rental-car-thumb" onerror="this.src='https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80'" />
                  <div class="rental-car-info">
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                      <span class="badge ${data.upcomingRental.bookingStatus === 'Active' ? 'badge-info' : 'badge-success'}">
                        <span class="badge-dot"></span> ${data.upcomingRental.bookingStatus || 'Confirmed'}
                      </span>
                      <span class="badge badge-primary">${data.upcomingRental.paymentStatus || 'Paid'}</span>
                      <span class="code-badge" style="font-size: 0.72rem;">#${data.upcomingRental.id}</span>
                    </div>
                    <h3>${data.upcomingRental.carName}</h3>
                    <div class="rental-detail-item">
                      <span class="detail-icon" style="color: var(--primary);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                      </span>
                      <span><strong>${formatDate(data.upcomingRental.pickupDate)}</strong> (${data.upcomingRental.pickupTime || '10:00 AM'}) ➔ <strong>${formatDate(data.upcomingRental.returnDate)}</strong> (${data.upcomingRental.returnTime || '06:00 PM'})</span>
                    </div>
                    <div class="rental-detail-item">
                      <span class="detail-icon" style="color: var(--rose);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      </span>
                      <span>${data.upcomingRental.pickupLocation}</span>
                    </div>
                    <div class="rental-price-tag">
                      <span>Total Amount:</span>
                      <strong>${formatCurrency(data.upcomingRental.totalAmount)}</strong>
                    </div>
                  </div>
                  <div class="countdown-box">
                    <span>TRIP STARTS IN</span>
                    <div class="countdown-main-num" id="countdown-days">0</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600;">Days</div>
                    <div class="countdown-units">
                      <span id="countdown-hrs">00</span>h : 
                      <span id="countdown-mins">00</span>m : 
                      <span id="countdown-secs">00</span>s
                    </div>
                  </div>
                </div>

                <div class="rental-actions">
                  <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.navigateTo('#car/${data.upcomingRental.carId}')">Car Details</button>
                  <button class="btn btn-outline btn-sm" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;" onclick="Booking.openPrintReceipt('${data.upcomingRental.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                    <span>Tax Invoice</span>
                  </button>
                </div>
              ` : `
                <div class="empty-upcoming-trip">
                  <div class="empty-upcoming-icon" style="color: var(--text-muted); opacity: 0.75;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4"/></svg>
                  </div>
                  <h4>Your next adventure awaits</h4>
                  <p>You have no active or scheduled reservations at the moment. Pick your dream car from our precision-engineered fleet.</p>
                  <button class="btn btn-primary btn-sm" onclick="App.navigateTo('#browse')">Explore Fleet & Book Now ➔</button>
                </div>
              `}
            </div>

            <!-- QUICK ACTIONS & PROFILE STATUS COLUMN -->
            <div style="display: flex; flex-direction: column; gap: 20px;">
              
              <!-- COLORFUL QUICK ACTIONS -->
              <div class="quick-actions-card glass-card">
                <div class="widget-title-row">
                  <div class="widget-title">
                    <span class="widget-title-icon-wrap" style="background: rgba(37, 99, 235, 0.12); color: #3b82f6;">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </span>
                    <span>Quick Actions</span>
                  </div>
                  <span class="view-all-link" onclick="App.navigateTo('#browse')">Explore All</span>
                </div>
                <div class="quick-actions-grid">
                  <div class="quick-act-btn act-blue" onclick="App.navigateTo('#browse')">
                    <span class="quick-act-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                    </span>
                    <span class="quick-act-label">Explore Cars</span>
                    <span class="quick-act-sub">Browse Fleet</span>
                  </div>
                  <div class="quick-act-btn act-purple" onclick="App.navigateTo('#user-bookings')">
                    <span class="quick-act-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </span>
                    <span class="quick-act-label">My Bookings</span>
                    <span class="quick-act-sub">Manage Trips</span>
                  </div>
                  <div class="quick-act-btn act-rose" onclick="App.navigateTo('#user-favourites')">
                    <span class="quick-act-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    </span>
                    <span class="quick-act-label">Saved Cars</span>
                    <span class="quick-act-sub">Wishlist</span>
                  </div>
                  <div class="quick-act-btn act-emerald" onclick="App.navigateTo('#user-payments')">
                    <span class="quick-act-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    </span>
                    <span class="quick-act-label">Payments</span>
                    <span class="quick-act-sub">Invoices</span>
                  </div>
                  <div class="quick-act-btn act-amber" onclick="App.navigateTo('#user-reviews')">
                    <span class="quick-act-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </span>
                    <span class="quick-act-label">My Reviews</span>
                    <span class="quick-act-sub">Feedback</span>
                  </div>
                  <div class="quick-act-btn act-cyan" onclick="App.navigateTo('#user-profile')">
                    <span class="quick-act-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                    <span class="quick-act-label">My Profile</span>
                    <span class="quick-act-sub">Account</span>
                  </div>
                </div>
              </div>

              <!-- PROFILE STATUS CARD -->
              <div class="profile-card glass-card">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <div>
                    <div class="widget-title" style="margin-bottom: 4px;">
                      <span class="widget-title-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </span>
                      <span>Profile Readiness</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Express handover active for complete verified profiles.</p>
                  </div>
                  <div class="profile-progress-ring">
                    <svg width="68" height="68" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-color)" stroke-width="3.5" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" stroke-dasharray="${data.profileCompletion || 85}, 100" stroke-width="3.5" stroke-linecap="round" />
                    </svg>
                    <div class="profile-percent-text">${data.profileCompletion || 85}%</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- 4. RECOMMENDED VEHICLES CAROUSEL -->
          <div class="recommended-section glass-card">
            <div class="widget-title-row" style="margin-bottom: 0;">
              <div class="widget-title">
                <span class="widget-title-icon-wrap" style="background: rgba(139, 92, 246, 0.12); color: #8b5cf6;">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </span>
                <span>Recommended Vehicles For You</span>
              </div>
              <span class="view-all-link" onclick="App.navigateTo('#browse')">Browse All Fleet (${data.recommendedCars?.length || 0}+ Available) ➔</span>
            </div>

            <div class="cars-carousel-grid">
              ${(data.recommendedCars || []).map(car => `
                <div class="car-card glass-card">
                  <div class="car-card-img-wrap" onclick="App.navigateTo('#car/${car.id}')">
                    <img src="${car.image}" alt="${car.name}" class="car-card-img" onerror="this.src='https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80'" />
                    <button class="fav-btn ${car.isFavourite ? 'active' : ''}" onclick="event.stopPropagation(); Browse.handleToggleFav('${car.id}', this); UserDash.updateNotificationBadge();">♥</button>
                    <span class="car-card-badge">${car.type}</span>
                  </div>
                  <div class="car-card-body">
                    <div>
                      <div class="car-name-rating">
                        <h4 class="car-title" onclick="App.navigateTo('#car/${car.id}')">${car.name}</h4>
                        <div class="car-rating-pill">★ ${car.rating} <span style="font-size: 0.68rem; color: var(--text-muted);">(${car.reviewsCount || 60})</span></div>
                      </div>
                      <div class="car-specs-row">
                        <span>👥 ${car.seats} Seats</span>
                        <span>⛽ ${car.fuel}</span>
                        <span>⚙ ${car.transmission}</span>
                      </div>
                    </div>
                    <div class="car-price-btn-row">
                      <div class="car-price-num">${formatCurrency(car.pricePerDay)}<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;"> /day</span></div>
                      <button class="btn btn-primary btn-sm" onclick="Booking.startBooking('${car.id}')">Book Now</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 5. WEEKEND PROMOTIONAL PRIVILEGE CARD -->
          <div class="weekend-promo-card">
            <div>
              <span class="badge badge-warning" style="margin-bottom: 8px;">EXCLUSIVE PRIVILEGE</span>
              <h3 style="font-size: 1.3rem; margin-bottom: 4px; font-weight: 800; color: var(--text-primary);">Get 20% Off Weekend Fleet Bookings</h3>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px; max-width: 600px;">
                Enjoy exceptional weekend getaways with premium delivery and zero deposit prerequisites.
              </p>
              <div class="promo-code-pill" onclick="navigator.clipboard.writeText('WEEKEND20'); showToast('Code Copied', 'Promo code WEEKEND20 copied to clipboard!', 'success')">
                <span>Use Code: <strong>WEEKEND20</strong></span>
                <span style="display: inline-flex; align-items: center; margin-left: 4px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </span>
              </div>
            </div>
            <div>
              <button class="btn btn-primary" onclick="App.navigateTo('#browse')">Claim Offer ➔</button>
            </div>
          </div>

          <!-- 6. BOTTOM 3-COLUMN ACTIVITY SECTION -->
          <div class="bottom-dashboard-grid">
            
            <!-- Recent Bookings -->
            <div class="glass-card activity-card" style="padding: 22px;">
              <div class="widget-title-row">
                <div class="widget-title">
                  <span class="widget-title-icon-wrap" style="background: rgba(37, 99, 235, 0.12); color: #3b82f6;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  </span>
                  <span>Recent Bookings</span>
                </div>
                <span class="view-all-link" onclick="App.navigateTo('#user-bookings')">View All</span>
              </div>

              <div>
                ${(data.recentBookings || []).length > 0 ? (data.recentBookings || []).map(b => `
                  <div class="list-item-row" onclick="App.navigateTo('#user-bookings')">
                    <div class="list-item-left">
                      <img src="${b.carImage}" alt="${b.carName}" class="list-item-thumb" onerror="this.src='https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=150&auto=format&fit=crop&q=80'" />
                      <div>
                        <div class="list-item-title">${b.carName}</div>
                        <div class="list-item-sub">${formatDate(b.pickupDate)} - ${formatDate(b.returnDate)}</div>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span class="badge ${b.bookingStatus === 'Confirmed' ? 'badge-success' : (b.bookingStatus === 'Completed' ? 'badge-purple' : (b.bookingStatus === 'Active' ? 'badge-info' : 'badge-danger'))}">
                        ${b.bookingStatus}
                      </span>
                      <div class="list-item-amount" style="margin-top: 4px;">${formatCurrency(b.totalAmount)}</div>
                    </div>
                  </div>
                `).join('') : `
                  <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">No recent bookings recorded.</div>
                `}
              </div>
            </div>

            <!-- Saved Favourites -->
            <div class="glass-card activity-card" style="padding: 22px;">
              <div class="widget-title-row">
                <div class="widget-title">
                  <span class="widget-title-icon-wrap" style="background: rgba(244, 63, 94, 0.12); color: #f43f5e;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </span>
                  <span>Saved Vehicles</span>
                </div>
                <span class="view-all-link" onclick="App.navigateTo('#user-favourites')">View All</span>
              </div>

              <div>
                ${(data.favouriteCars || []).length > 0 ? (data.favouriteCars || []).map(c => `
                  <div class="list-item-row">
                    <div class="list-item-left" onclick="App.navigateTo('#car/${c.id}')" style="cursor: pointer;">
                      <img src="${c.image}" alt="${c.name}" class="list-item-thumb" onerror="this.src='https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=150&auto=format&fit=crop&q=80'" />
                      <div>
                        <div class="list-item-title">${c.name}</div>
                        <div class="list-item-sub">${c.type} • ${c.transmission}</div>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div class="list-item-amount">${formatCurrency(c.pricePerDay)}/d</div>
                      <button class="btn btn-primary btn-sm" style="padding: 3px 8px; font-size: 0.72rem; margin-top: 4px;" onclick="Booking.startBooking('${c.id}')">Book</button>
                    </div>
                  </div>
                `).join('') : `
                  <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">No favourite cars saved yet.</div>
                `}
              </div>
            </div>

            <!-- Payment History -->
            <div class="glass-card activity-card" style="padding: 22px;">
              <div class="widget-title-row">
                <div class="widget-title">
                  <span class="widget-title-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  </span>
                  <span>Payment History</span>
                </div>
                <span class="view-all-link" onclick="App.navigateTo('#user-payments')">View All</span>
              </div>

              <div>
                ${(data.recentPayments || []).length > 0 ? (data.recentPayments || []).map(p => `
                  <div class="list-item-row" onclick="Booking.openPrintReceipt('${p.bookingId}')" style="cursor: pointer;">
                    <div class="list-item-left">
                      <div class="list-item-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--emerald);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                      </div>
                      <div>
                        <div class="list-item-title">${p.carName}</div>
                        <div class="list-item-sub">${formatDate(p.date)} • ${p.method || 'Card'}</div>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span class="badge ${p.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${p.status}</span>
                      <div class="list-item-amount" style="margin-top: 4px;">${formatCurrency(p.amount)}</div>
                    </div>
                  </div>
                `).join('') : `
                  <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">No payment transactions found.</div>
                `}
              </div>
            </div>

          </div>
        </div>
      `;

      // Start live countdown timer only if upcoming rental exists
      if (data.upcomingRental && data.upcomingRental.pickupDate) {
        this.startCountdown(data.upcomingRental.pickupDate);
      }
    } catch (err) {
      container.innerHTML = `
        <div class="dash-content">
          <div style="padding: 40px; text-align: center; color: var(--rose);">
            <h3>Error loading dashboard</h3>
            <p style="color: var(--text-secondary); margin-top: 6px;">${err.message}</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="UserDash.renderOverview()">Try Again</button>
          </div>
        </div>
      `;
    }
  },

  startCountdown(targetDateStr) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const update = () => {
      const target = new Date(targetDateStr).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const dEl = document.getElementById('countdown-days');
      const hEl = document.getElementById('countdown-hrs');
      const mEl = document.getElementById('countdown-mins');
      const sEl = document.getElementById('countdown-secs');

      if (dEl) dEl.textContent = days;
      if (hEl) hEl.textContent = String(hrs).padStart(2, '0');
      if (mEl) mEl.textContent = String(mins).padStart(2, '0');
      if (sEl) sEl.textContent = String(secs).padStart(2, '0');
    };

    update();
    this.countdownInterval = setInterval(update, 1000);
  },

  // 2. MY BOOKINGS VIEW (Luxury Automotive Reservation Management)
  async renderMyBookings() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Polished Skeleton Loader
    container.innerHTML = `
      <div class="dash-content">
        <div class="dash-page-header-row" style="margin-bottom: 20px;">
          <div>
            <div class="skeleton" style="height: 32px; width: 220px; margin-bottom: 8px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="height: 18px; width: 340px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton" style="height: 42px; width: 150px; border-radius: var(--radius-md);"></div>
        </div>

        <!-- 4 KPI Summary Skeletons -->
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
        </div>

        <!-- Filter Bar Skeleton -->
        <div class="skeleton" style="height: 52px; border-radius: var(--radius-lg); margin-bottom: 20px;"></div>

        <!-- Booking Cards Skeletons -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="skeleton" style="height: 180px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 180px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;

    try {
      const bookings = await BookingsAPI.getAll();

      // Compute Real Authenticated KPI Counts
      const totalBookings = bookings.length;
      const upcomingCount = bookings.filter(b => ['Confirmed', 'Pending'].includes(b.bookingStatus)).length;
      const activeCount = bookings.filter(b => b.bookingStatus === 'Active').length;
      const completedCount = bookings.filter(b => b.bookingStatus === 'Completed').length;
      const cancelledCount = bookings.filter(b => b.bookingStatus === 'Cancelled').length;

      const filtered = this.filterBookings(bookings);

      container.innerHTML = `
        <div class="dash-content">
          
          <!-- 1. LUXURY PAGE HEADER -->
          <div class="dash-page-header-row">
            <div>
              <div class="dash-page-badge">
                <span class="badge-dot" style="background: var(--primary); box-shadow: 0 0 6px var(--primary);"></span>
                <span>Fleet Reservations</span>
              </div>
              <h1 class="dash-page-title">My Bookings</h1>
              <p class="dash-page-sub">Manage your reservations and keep track of every journey.</p>
            </div>
            <div class="dash-header-cta-group">
              <button class="btn btn-primary" onclick="App.navigateTo('#browse')" id="my-bookings-explore-cta">
                <span>Explore Cars</span>
                <span style="font-size: 1.1rem; line-height: 1;">➔</span>
              </button>
            </div>
          </div>

          <!-- 2. 4 REAL-DATA BOOKING SUMMARY KPI CARDS -->
          <div class="kpi-grid">
            
            <!-- 1. Total Bookings (Blue Accent) -->
            <div class="kpi-card kpi-card-blue glass-card" onclick="UserDash.setBookingsTab('all')" title="Filter: All Reservations">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span class="kpi-label">Total Bookings</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${totalBookings}</div>
                <div class="kpi-sub-badge badge-blue">All Reservations</div>
              </div>
            </div>

            <!-- 2. Upcoming Trips (Amber/Orange Accent) -->
            <div class="kpi-card kpi-card-orange glass-card" onclick="UserDash.setBookingsTab('upcoming')" title="Filter: Upcoming Trips">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span class="kpi-label">Upcoming Trips</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${upcomingCount}</div>
                <div class="kpi-sub-badge badge-orange">Scheduled Departures</div>
              </div>
            </div>

            <!-- 3. Active Rentals (Violet Accent) -->
            <div class="kpi-card kpi-card-purple glass-card" onclick="UserDash.setBookingsTab('active')" title="Filter: Active Rentals">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-4"/></svg>
                </div>
                <span class="kpi-label">Active Rentals</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${activeCount}</div>
                <div class="kpi-sub-badge badge-purple">Currently On Road</div>
              </div>
            </div>

            <!-- 4. Completed Trips (Emerald Accent) -->
            <div class="kpi-card kpi-card-emerald glass-card" onclick="UserDash.setBookingsTab('completed')" title="Filter: Completed Trips">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-emerald">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span class="kpi-label">Completed Trips</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${completedCount}</div>
                <div class="kpi-sub-badge badge-emerald">Finished Journeys</div>
              </div>
            </div>

          </div>

          <!-- 3. PREMIUM FILTER BAR & SEARCH -->
          <div class="booking-filters-bar glass-card">
            <div class="booking-filter-tabs">
              ${[
                { id: 'all', label: 'All', count: totalBookings },
                { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
                { id: 'active', label: 'Active', count: activeCount },
                { id: 'completed', label: 'Completed', count: completedCount },
                { id: 'cancelled', label: 'Cancelled', count: cancelledCount }
              ].map(tab => `
                <button class="booking-filter-pill ${this.activeBookingsTab.toLowerCase() === tab.id ? 'active' : ''}" 
                        onclick="UserDash.setBookingsTab('${tab.id}')"
                        id="booking-filter-${tab.id}">
                  <span>${tab.label}</span>
                  <span class="filter-count-badge">${tab.count}</span>
                </button>
              `).join('')}
            </div>

            <div class="booking-filter-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" 
                     class="booking-search-input" 
                     placeholder="Search by car, ID, or city..." 
                     value="${this.bookingSearchQuery || ''}"
                     oninput="UserDash.bookingSearchQuery = this.value; UserDash.renderMyBookings();" 
                     id="booking-search-input" />
              ${this.bookingSearchQuery ? `
                <button class="booking-search-clear" onclick="UserDash.bookingSearchQuery = ''; UserDash.renderMyBookings();" title="Clear search">✕</button>
              ` : ''}
            </div>
          </div>

          <!-- 4. BOOKINGS RESERVATIONS LIST -->
          <div class="bookings-list-container">
            ${filtered.map(b => {
              const safeCarName = (b.carName || 'Luxury Vehicle').replace(/'/g, "\\'");
              const isUpcoming = ['Confirmed', 'Pending'].includes(b.bookingStatus);
              const isCompleted = b.bookingStatus === 'Completed';
              const isActive = b.bookingStatus === 'Active';
              const isCancelled = b.bookingStatus === 'Cancelled';

              let statusBadgeClass = 'status-confirmed';
              if (isActive) statusBadgeClass = 'status-active';
              else if (isCompleted) statusBadgeClass = 'status-completed';
              else if (isCancelled) statusBadgeClass = 'status-cancelled';
              else if (b.bookingStatus === 'Pending') statusBadgeClass = 'status-pending';

              let paymentBadgeClass = 'payment-paid';
              if (b.paymentStatus === 'Pending') paymentBadgeClass = 'payment-pending';
              else if (b.paymentStatus === 'Refunded') paymentBadgeClass = 'payment-refunded';

              return `
                <div class="booking-card glass-card" id="booking-card-${b.id}">
                  
                  <!-- Left: Controlled Vehicle Media Thumbnail -->
                  <div class="booking-card-media" onclick="App.navigateTo('#car/${b.carId}')" title="View vehicle specifications">
                    <img src="${b.carImage || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&auto=format&fit=crop&q=80'}" 
                         alt="${b.carName}" 
                         class="booking-car-thumb" 
                         loading="lazy" />
                    <span class="booking-category-tag">${b.carType || 'Luxury'}</span>
                  </div>

                  <!-- Middle: Booking Info & Route Schedule Grid -->
                  <div class="booking-card-body">
                    <div class="booking-card-header">
                      <div class="booking-title-wrap">
                        <div class="booking-meta-pills">
                          <span class="booking-id-pill">#${b.id}</span>
                          <span class="booking-status-badge ${statusBadgeClass}">
                            <span class="status-pulse-dot"></span>
                            ${b.bookingStatus}
                          </span>
                          <span class="booking-payment-badge ${paymentBadgeClass}">
                            ${b.paymentStatus}
                          </span>
                        </div>
                        <h3 class="booking-car-name" onclick="App.navigateTo('#car/${b.carId}')">${b.carName}</h3>
                      </div>
                    </div>

                    <!-- Trip Schedule & Location Details -->
                    <div class="booking-trip-grid">
                      
                      <!-- Pickup Detail -->
                      <div class="booking-trip-col">
                        <div class="trip-col-label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span>PICKUP SCHEDULE</span>
                        </div>
                        <div class="trip-col-time">${formatDate(b.pickupDate)} • ${b.pickupTime || '10:00 AM'}</div>
                        <div class="trip-col-loc">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>${b.pickupLocation || 'Main Hub'}</span>
                        </div>
                      </div>

                      <!-- Divider Arrow & Duration Tag -->
                      <div class="booking-trip-divider">
                        <span class="trip-duration-pill">${b.days} ${b.days === 1 ? 'Day' : 'Days'}</span>
                        <div class="trip-arrow-line">➔</div>
                      </div>

                      <!-- Return Detail -->
                      <div class="booking-trip-col">
                        <div class="trip-col-label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--cyan);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <span>RETURN SCHEDULE</span>
                        </div>
                        <div class="trip-col-time">${formatDate(b.returnDate)} • ${b.returnTime || '06:00 PM'}</div>
                        <div class="trip-col-loc">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span>${b.returnLocation || b.pickupLocation || 'Main Hub'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <!-- Right: Financial Amount & Allowed Action Buttons -->
                  <div class="booking-card-side">
                    <div class="booking-price-block">
                      <div class="booking-price-label">TOTAL AMOUNT</div>
                      <div class="booking-price-value">${formatCurrency(b.totalAmount)}</div>
                      <div class="booking-price-sub">Includes Taxes & Insurance</div>
                    </div>

                    <div class="booking-actions-row">
                      <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('#car/${b.carId}')" title="View car specifications">
                        Car Details
                      </button>
                      <button class="btn btn-secondary btn-sm" onclick="Booking.openPrintReceipt('${b.id}')" title="Print official GST tax invoice">
                        🖨️ Tax Invoice
                      </button>
                      ${isUpcoming ? `
                        <button class="btn btn-danger btn-sm" onclick="UserDash.cancelBooking('${b.id}', '${safeCarName}')" title="Cancel this reservation">
                          Cancel Booking
                        </button>
                      ` : ''}
                      ${isCompleted ? `
                        <button class="btn btn-primary btn-sm" onclick="UserDash.openReviewModal('${b.carId}', '${safeCarName}')" title="Rate and review your driving experience">
                          ★ Write Review
                        </button>
                      ` : ''}
                    </div>
                  </div>

                </div>
              `;
            }).join('')}

            <!-- 5. EMPTY STATES -->
            ${bookings.length === 0 ? `
              <!-- User Has Zero Total Bookings -->
              <div class="booking-empty-card glass-card">
                <div class="empty-car-glow"></div>
                <div class="booking-empty-icon">🚗</div>
                <h3 class="booking-empty-title">Your next adventure awaits.</h3>
                <p class="booking-empty-sub">Explore our fleet and find the perfect car for your next trip.</p>
                <button class="btn btn-primary" onclick="App.navigateTo('#browse')" style="margin-top: 10px;">
                  <span>Explore Cars</span>
                  <span style="font-size: 1.1rem; line-height: 1;">➔</span>
                </button>
              </div>
            ` : (filtered.length === 0 ? `
              <!-- Filter / Search has Zero Results -->
              <div class="booking-empty-card glass-card">
                <div class="booking-empty-icon">🔍</div>
                <h3 class="booking-empty-title">No bookings found in this category.</h3>
                <p class="booking-empty-sub">
                  ${this.bookingSearchQuery 
                    ? `No reservations match "${this.bookingSearchQuery}" under the ${this.activeBookingsTab} filter.` 
                    : `You have no ${this.activeBookingsTab} reservations.`}
                </p>
                <button class="btn btn-secondary" onclick="UserDash.activeBookingsTab = 'all'; UserDash.bookingSearchQuery = ''; UserDash.renderMyBookings();" style="margin-top: 10px;">
                  Reset Filters & View All
                </button>
              </div>
            ` : '')}

          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="dash-content">
          <div class="glass-card" style="padding: 40px; text-align: center; border: 1px solid rgba(244, 63, 94, 0.3);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
            <h3 style="color: var(--rose); margin-bottom: 6px;">Error Loading Bookings</h3>
            <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px;">${err.message || 'Unable to load reservations from the server. Please check your connection and try again.'}</p>
            <button class="btn btn-primary btn-sm" onclick="UserDash.renderMyBookings()">Try Again</button>
          </div>
        </div>
      `;
    }
  },

  setBookingsTab(tabId) {
    this.activeBookingsTab = (tabId || 'all').toLowerCase();
    this.renderMyBookings();
  },

  getTabBookingCount(bookings, tab) {
    const t = (tab || '').toLowerCase();
    if (t === 'all') return bookings.length;
    if (t === 'upcoming') return bookings.filter(b => ['Confirmed', 'Pending'].includes(b.bookingStatus)).length;
    return bookings.filter(b => (b.bookingStatus || '').toLowerCase() === t).length;
  },

  filterBookings(bookings) {
    let list = bookings;
    
    // Status Filter
    const tab = (this.activeBookingsTab || 'all').toLowerCase();
    if (tab === 'upcoming') {
      list = list.filter(b => ['Confirmed', 'Pending'].includes(b.bookingStatus));
    } else if (tab !== 'all') {
      list = list.filter(b => (b.bookingStatus || '').toLowerCase() === tab);
    }

    // Search Query Filter
    if (this.bookingSearchQuery && this.bookingSearchQuery.trim()) {
      const q = this.bookingSearchQuery.trim().toLowerCase();
      list = list.filter(b => 
        (b.carName && b.carName.toLowerCase().includes(q)) ||
        (b.id && b.id.toLowerCase().includes(q)) ||
        (b.pickupLocation && b.pickupLocation.toLowerCase().includes(q)) ||
        (b.returnLocation && b.returnLocation.toLowerCase().includes(q)) ||
        (b.bookingStatus && b.bookingStatus.toLowerCase().includes(q))
      );
    }

    return list;
  },

  async cancelBooking(bookingId, carName = 'this car') {
    const confirmed = confirm(`Are you sure you want to cancel booking #${bookingId} for ${carName}?\n\nIf you have already made a payment, a 100% full refund will be processed to your original payment method immediately.`);
    if (!confirmed) return;

    try {
      await BookingsAPI.cancel(bookingId);
      showToast('Booking Cancelled', `Booking #${bookingId} has been cancelled and refund processed.`, 'info');
      await this.renderMyBookings();
      this.updateNotificationBadge();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  },

  // 3. FAVOURITES VIEW (Luxury Automotive Saved Vehicle Collection)
  async renderFavourites() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Polished Skeleton Loader
    container.innerHTML = `
      <div class="dash-content">
        <div class="dash-page-header-row" style="margin-bottom: 20px;">
          <div>
            <div class="skeleton" style="height: 32px; width: 220px; margin-bottom: 8px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="height: 18px; width: 340px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton" style="height: 42px; width: 150px; border-radius: var(--radius-md);"></div>
        </div>

        <!-- Filter Bar Skeleton -->
        <div class="skeleton" style="height: 52px; border-radius: var(--radius-xl); margin-bottom: 24px;"></div>

        <!-- Vehicle Cards Grid Skeletons -->
        <div class="fav-cars-grid">
          <div class="skeleton" style="height: 380px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 380px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 380px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;

    try {
      const favCars = await FavouritesAPI.getAll();

      // Available categories from user's actual favourites
      const availableCategories = ['all', ...new Set(favCars.map(c => c.type).filter(Boolean))];
      const availableCount = favCars.filter(c => c.status === 'Available' && c.isAvailableForDates !== false).length;

      const filtered = this.filterFavourites(favCars);

      container.innerHTML = `
        <div class="dash-content">
          
          <!-- 1. LUXURY PAGE HEADER -->
          <div class="dash-page-header-row">
            <div>
              <div class="dash-page-badge" style="background: rgba(244, 63, 94, 0.1); color: var(--rose); border-color: rgba(244, 63, 94, 0.25);">
                <span class="badge-dot" style="background: var(--rose); box-shadow: 0 0 6px var(--rose);"></span>
                <span>Saved Collection • ${favCars.length} ${favCars.length === 1 ? 'Vehicle' : 'Vehicles'}</span>
              </div>
              <h1 class="dash-page-title">My Favourites</h1>
              <p class="dash-page-sub">Your favourite cars, ready for your next journey.</p>
            </div>
            <div class="dash-header-cta-group">
              <button class="btn btn-primary" onclick="App.navigateTo('#browse')" id="my-favs-explore-cta">
                <span>Explore Cars</span>
                <span style="font-size: 1.1rem; line-height: 1;">➔</span>
              </button>
            </div>
          </div>

          <!-- 2. SEARCH AND CATEGORY FILTER BAR (Only if user has favourites) -->
          ${favCars.length > 0 ? `
            <div class="fav-filters-bar glass-card">
              
              <!-- Category Filter Chips -->
              <div class="fav-filter-tabs">
                ${availableCategories.map(cat => {
                  const count = cat === 'all' ? favCars.length : favCars.filter(c => (c.type || '').toLowerCase() === cat.toLowerCase()).length;
                  const label = cat === 'all' ? 'All Vehicles' : cat;
                  const isActive = (this.favActiveCategory || 'all').toLowerCase() === cat.toLowerCase();
                  return `
                    <button class="fav-filter-pill ${isActive ? 'active' : ''}" 
                            onclick="UserDash.setFavCategory('${cat}')"
                            id="fav-cat-${cat.toLowerCase()}">
                      <span>${label}</span>
                      <span class="filter-count-badge">${count}</span>
                    </button>
                  `;
                }).join('')}

                <!-- Available Only Toggle -->
                <button class="fav-filter-pill fav-avail-pill ${this.favAvailabilityOnly ? 'active' : ''}" 
                        onclick="UserDash.toggleFavAvailability()"
                        title="Show available cars only">
                  <span class="badge-dot" style="background: var(--emerald);"></span>
                  <span>Available Now</span>
                  <span class="filter-count-badge">${availableCount}</span>
                </button>
              </div>

              <!-- Controls Right: Sort & Search -->
              <div class="fav-controls-right">
                
                <!-- Sort Dropdown -->
                <div class="fav-sort-wrap">
                  <select class="fav-sort-select" onchange="UserDash.favSortOption = this.value; UserDash.renderFavourites();">
                    <option value="default" ${this.favSortOption === 'default' ? 'selected' : ''}>Sort: Default</option>
                    <option value="price-asc" ${this.favSortOption === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                    <option value="price-desc" ${this.favSortOption === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                    <option value="rating-desc" ${this.favSortOption === 'rating-desc' ? 'selected' : ''}>Highest Rated</option>
                  </select>
                </div>

                <!-- Search Input -->
                <div class="booking-filter-search" style="width: 240px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" 
                         class="booking-search-input" 
                         placeholder="Search favourites..." 
                         value="${this.favSearchQuery || ''}"
                         oninput="UserDash.favSearchQuery = this.value; UserDash.renderFavourites();" 
                         id="fav-search-input" />
                  ${this.favSearchQuery ? `
                    <button class="booking-search-clear" onclick="UserDash.favSearchQuery = ''; UserDash.renderFavourites();" title="Clear search">✕</button>
                  ` : ''}
                </div>
              </div>

            </div>
          ` : ''}

          <!-- 3. SAVED VEHICLES RESPONSIVE GRID -->
          <div class="fav-cars-grid">
            ${filtered.map(car => {
              const isAvailable = car.status === 'Available' && car.isAvailableForDates !== false;
              const safeCarName = (car.name || 'Luxury Vehicle').replace(/'/g, "\\'");
              const subCat = car.type === 'Sedan' ? 'Luxury Sedan' : (car.type === 'SUV' ? 'Luxury SUV' : (car.type === 'Sports' ? 'Super Sports' : car.type));

              return `
                <div class="fav-car-card glass-card" id="fav-car-${car.id}">
                  
                  <!-- Top Vehicle Image & Quick Badges -->
                  <div class="fav-card-img-wrap" onclick="App.navigateTo('#car/${car.id}')" title="View ${car.name} specifications">
                    <img src="${car.image}" alt="${car.name}" class="fav-card-img" loading="lazy" />
                    
                    <!-- Badges Overlay -->
                    <div class="fav-card-badges-top">
                      <span class="fav-badge-tag ${isAvailable ? 'badge-avail-yes' : 'badge-avail-no'}">
                        <span class="status-pulse-dot" style="${isAvailable ? 'background: #10b981; box-shadow: 0 0 6px #10b981;' : 'background: #f43f5e;'}"></span>
                        ${isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                      <span class="fav-badge-tag badge-category">
                        ${car.type}
                      </span>
                    </div>

                    <!-- Heart Action Button (Remove Favourite) -->
                    <button class="fav-remove-btn" 
                            onclick="event.stopPropagation(); UserDash.removeFavourite('${car.id}', '${safeCarName}');" 
                            title="Remove from Favourites"
                            id="fav-remove-btn-${car.id}">
                      ♥
                    </button>
                  </div>

                  <!-- Card Body -->
                  <div class="fav-card-body">
                    
                    <!-- Header Info -->
                    <div class="fav-card-header">
                      <div class="fav-title-row">
                        <span class="fav-car-brand">${car.brand || 'Luxury'} • ${subCat}</span>
                        <h3 class="fav-car-title" onclick="App.navigateTo('#car/${car.id}')" title="${car.name}">${car.name}</h3>
                      </div>
                      <div class="fav-rating-pill">
                        <span style="color: var(--amber);">★</span>
                        <span>${car.rating || '4.9'}</span>
                        <span class="fav-reviews-count">(${car.reviewsCount || 85})</span>
                      </div>
                    </div>

                    <!-- Specs Chips Grid -->
                    <div class="fav-specs-grid">
                      <span class="fav-spec-chip" title="Seating Capacity">👥 ${car.seats} Seats</span>
                      <span class="fav-spec-chip" title="Transmission">⚙ ${car.transmission || 'Automatic'}</span>
                      <span class="fav-spec-chip" title="Fuel Type">⛽ ${car.fuel || 'Petrol'}</span>
                      <span class="fav-spec-chip" title="Engine Output">⚡ ${car.power || '300 HP'}</span>
                    </div>

                    <!-- Price & Actions Footer -->
                    <div class="fav-card-footer">
                      <div class="fav-price-block">
                        <div class="fav-card-price">${formatCurrency(car.pricePerDay)}<span class="fav-price-sub"> / day</span></div>
                        <div class="fav-price-note">All Taxes Included</div>
                      </div>

                      <div class="fav-actions-group">
                        <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('#car/${car.id}')" title="View detailed vehicle specifications">
                          Details
                        </button>
                        <button class="btn btn-primary btn-sm" 
                                ${!isAvailable ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="Currently unavailable for booking"' : ''}
                                onclick="Booking.startBooking('${car.id}')" 
                                title="Book this car now">
                          ${isAvailable ? 'Book Now' : 'Unavailable'}
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              `;
            }).join('')}

            <!-- 4. EMPTY STATES -->
            ${favCars.length === 0 ? `
              <!-- User Has Zero Total Favourites -->
              <div class="fav-empty-card glass-card">
                <div class="empty-fav-glow"></div>
                <div class="fav-empty-icon">♥</div>
                <h3 class="fav-empty-title">Your dream drive starts here.</h3>
                <p class="fav-empty-sub">Save the cars you love and find them here whenever you return.</p>
                <button class="btn btn-primary" onclick="App.navigateTo('#browse')" style="margin-top: 10px;">
                  <span>Explore Cars</span>
                  <span style="font-size: 1.1rem; line-height: 1;">➔</span>
                </button>
              </div>
            ` : (filtered.length === 0 ? `
              <!-- Filter / Search has Zero Results -->
              <div class="fav-empty-card glass-card">
                <div class="fav-empty-icon">🔍</div>
                <h3 class="fav-empty-title">No favourites match your filters.</h3>
                <p class="fav-empty-sub">
                  ${this.favSearchQuery 
                    ? `No saved cars match "${this.favSearchQuery}".` 
                    : 'No saved cars match the selected category or availability filter.'}
                </p>
                <button class="btn btn-secondary" onclick="UserDash.resetFavFilters()" style="margin-top: 10px;">
                  Reset Filters & View All
                </button>
              </div>
            ` : '')}

          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="dash-content">
          <div class="glass-card" style="padding: 40px; text-align: center; border: 1px solid rgba(244, 63, 94, 0.3);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
            <h3 style="color: var(--rose); margin-bottom: 6px;">Error Loading Favourites</h3>
            <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px;">${err.message || 'Unable to retrieve your saved collection. Please try again.'}</p>
            <button class="btn btn-primary btn-sm" onclick="UserDash.renderFavourites()">Try Again</button>
          </div>
        </div>
      `;
    }
  },

  setFavCategory(cat) {
    this.favActiveCategory = (cat || 'all').toLowerCase();
    this.renderFavourites();
  },

  toggleFavAvailability() {
    this.favAvailabilityOnly = !this.favAvailabilityOnly;
    this.renderFavourites();
  },

  resetFavFilters() {
    this.favSearchQuery = '';
    this.favActiveCategory = 'all';
    this.favAvailabilityOnly = false;
    this.favSortOption = 'default';
    this.renderFavourites();
  },

  filterFavourites(favCars) {
    let list = [...favCars];

    // Category Filter
    if (this.favActiveCategory && this.favActiveCategory !== 'all') {
      list = list.filter(c => (c.type || '').toLowerCase() === this.favActiveCategory.toLowerCase());
    }

    // Availability Filter
    if (this.favAvailabilityOnly) {
      list = list.filter(c => c.status === 'Available' && c.isAvailableForDates !== false);
    }

    // Search Query Filter
    if (this.favSearchQuery && this.favSearchQuery.trim()) {
      const q = this.favSearchQuery.trim().toLowerCase();
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.brand && c.brand.toLowerCase().includes(q)) ||
        (c.type && c.type.toLowerCase().includes(q))
      );
    }

    // Sort Option
    if (this.favSortOption === 'price-asc') {
      list.sort((a, b) => (Number(a.pricePerDay) || 0) - (Number(b.pricePerDay) || 0));
    } else if (this.favSortOption === 'price-desc') {
      list.sort((a, b) => (Number(b.pricePerDay) || 0) - (Number(a.pricePerDay) || 0));
    } else if (this.favSortOption === 'rating-desc') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }

    return list;
  },

  async removeFavourite(carId, carName = 'Vehicle') {
    try {
      await FavouritesAPI.toggle(carId);
      showToast('Removed from Favourites', `${carName} has been removed from your saved cars.`, 'info');
      await this.renderFavourites();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  },

  // 4. PAYMENTS VIEW (Luxury Automotive Financial Ledger & Tax Receipts)
  async renderPayments() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Polished Skeleton Loader
    container.innerHTML = `
      <div class="dash-content">
        <div class="dash-page-header-row" style="margin-bottom: 20px;">
          <div>
            <div class="skeleton" style="height: 32px; width: 260px; margin-bottom: 8px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="height: 18px; width: 380px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton" style="height: 42px; width: 150px; border-radius: var(--radius-md);"></div>
        </div>

        <!-- 4 KPI Summary Skeletons -->
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
        </div>

        <!-- Filter Bar Skeleton -->
        <div class="skeleton" style="height: 52px; border-radius: var(--radius-xl); margin-bottom: 20px;"></div>

        <!-- Table Card Skeleton -->
        <div class="skeleton" style="height: 320px; border-radius: var(--radius-xl);"></div>
      </div>
    `;

    try {
      const payments = await PaymentsAPI.getAll();

      // Compute Real Authenticated Financial Metrics
      const totalPaid = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const paidCount = payments.filter(p => p.status === 'Paid').length;
      const pendingCount = payments.filter(p => p.status === 'Pending').length;
      const refundedCount = payments.filter(p => p.status === 'Refunded').length;
      const refundedAmount = payments.filter(p => p.status === 'Refunded').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const failedCount = payments.filter(p => p.status === 'Failed').length;

      // Unique Payment Methods in User's Records
      const availableMethods = ['all', ...new Set(payments.map(p => p.method).filter(Boolean))];

      const filtered = this.filterPayments(payments);

      const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${datePart} • ${timePart}`;
      };

      container.innerHTML = `
        <div class="dash-content">
          
          <!-- 1. LUXURY PAGE HEADER -->
          <div class="dash-page-header-row">
            <div>
              <div class="dash-page-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--emerald); border-color: rgba(16, 185, 129, 0.25);">
                <span class="badge-dot" style="background: var(--emerald); box-shadow: 0 0 6px var(--emerald);"></span>
                <span>Verified Financial Ledger • ${payments.length} Transactions</span>
              </div>
              <h1 class="dash-page-title">Payments & Transactions</h1>
              <p class="dash-page-sub">Track your payments and view your rental transaction history.</p>
            </div>
            <div class="dash-header-cta-group">
              <button class="btn btn-secondary" onclick="App.navigateTo('#user-bookings')" id="payments-bookings-cta">
                <span>View Bookings</span>
              </button>
              <button class="btn btn-primary" onclick="App.navigateTo('#browse')" id="payments-explore-cta">
                <span>Explore Cars</span>
                <span style="font-size: 1.1rem; line-height: 1;">➔</span>
              </button>
            </div>
          </div>

          <!-- 2. 4 REAL-DATA PAYMENT SUMMARY KPI CARDS -->
          <div class="kpi-grid">
            
            <!-- 1. Total Paid (Emerald Accent) -->
            <div class="kpi-card kpi-card-emerald glass-card" onclick="UserDash.setPaymentStatusFilter('paid')" title="Filter: Successful Payments">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-emerald">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span class="kpi-label">Total Paid</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${formatCurrency(totalPaid)}</div>
                <div class="kpi-sub-badge badge-emerald">Verified Spend</div>
              </div>
            </div>

            <!-- 2. Successful Transactions (Blue Accent) -->
            <div class="kpi-card kpi-card-blue glass-card" onclick="UserDash.setPaymentStatusFilter('paid')" title="Filter: Paid Transactions">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span class="kpi-label">Successful Transactions</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${paidCount}</div>
                <div class="kpi-sub-badge badge-blue">Settled Invoices</div>
              </div>
            </div>

            <!-- 3. Pending Payments (Amber/Orange Accent) -->
            <div class="kpi-card kpi-card-orange glass-card" onclick="UserDash.setPaymentStatusFilter('pending')" title="Filter: Pending Transactions">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span class="kpi-label">Pending Payments</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${pendingCount}</div>
                <div class="kpi-sub-badge badge-orange">Awaiting Settlement</div>
              </div>
            </div>

            <!-- 4. Refunds & Adjustments (Violet Accent) -->
            <div class="kpi-card kpi-card-purple glass-card" onclick="UserDash.setPaymentStatusFilter('refunded')" title="Filter: Refunded Transactions">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                </div>
                <span class="kpi-label">Refunds & Adjustments</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${refundedCount}</div>
                <div class="kpi-sub-badge badge-purple">${formatCurrency(refundedAmount)} Refunded</div>
              </div>
            </div>

          </div>

          <!-- 3. PREMIUM FILTER BAR & SEARCH -->
          ${payments.length > 0 ? `
            <div class="payment-filters-bar glass-card">
              
              <!-- Status Filter Tabs -->
              <div class="payment-filter-tabs">
                ${[
                  { id: 'all', label: 'All', count: payments.length },
                  { id: 'paid', label: 'Paid', count: paidCount },
                  { id: 'pending', label: 'Pending', count: pendingCount },
                  { id: 'refunded', label: 'Refunded', count: refundedCount },
                  ...(failedCount > 0 ? [{ id: 'failed', label: 'Failed', count: failedCount }] : [])
                ].map(tab => `
                  <button class="payment-filter-pill ${this.paymentStatusFilter.toLowerCase() === tab.id ? 'active' : ''}" 
                          onclick="UserDash.setPaymentStatusFilter('${tab.id}')"
                          id="payment-filter-${tab.id}">
                    <span>${tab.label}</span>
                    <span class="filter-count-badge">${tab.count}</span>
                  </button>
                `).join('')}
              </div>

              <!-- Controls Right: Method Selector & Search Input -->
              <div class="payment-controls-right">
                
                <!-- Payment Method Filter Dropdown -->
                ${availableMethods.length > 2 ? `
                  <div class="payment-method-wrap">
                    <select class="fav-sort-select" onchange="UserDash.paymentMethodFilter = this.value; UserDash.renderPayments();">
                      ${availableMethods.map(m => `
                        <option value="${m}" ${this.paymentMethodFilter === m ? 'selected' : ''}>${m === 'all' ? 'All Methods' : m}</option>
                      `).join('')}
                    </select>
                  </div>
                ` : ''}

                <!-- Search Input -->
                <div class="booking-filter-search" style="width: 260px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" 
                         class="booking-search-input" 
                         placeholder="Search payment ID, booking, car..." 
                         value="${this.paymentSearchQuery || ''}"
                         oninput="UserDash.paymentSearchQuery = this.value; UserDash.renderPayments();" 
                         id="payment-search-input" />
                  ${this.paymentSearchQuery ? `
                    <button class="booking-search-clear" onclick="UserDash.paymentSearchQuery = ''; UserDash.renderPayments();" title="Clear search">✕</button>
                  ` : ''}
                </div>
              </div>

            </div>
          ` : ''}

          <!-- 4. TRANSACTION LEDGER TABLE -->
          <div class="payment-ledger-card glass-card">
            
            <div class="table-responsive">
              <table class="payment-ledger-table">
                <thead>
                  <tr>
                    <th>TRANSACTION ID</th>
                    <th>RESERVATION & VEHICLE</th>
                    <th>PAYMENT METHOD</th>
                    <th>DATE & TIME</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th style="text-align: right;">TAX INVOICE</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(p => {
                    let statusBadgeClass = 'status-paid';
                    if (p.status === 'Refunded') statusBadgeClass = 'status-refunded';
                    else if (p.status === 'Pending' || p.status === 'Pay at Pickup') statusBadgeClass = 'status-pending';
                    else if (p.status === 'Failed') statusBadgeClass = 'status-failed';

                    let methodIcon = '💳';
                    if (p.method === 'UPI') methodIcon = '📱';
                    else if (p.method === 'Net Banking') methodIcon = '🏦';
                    else if (p.method === 'Wallet') methodIcon = '👛';
                    else if (p.method === 'Pay at Pickup' || p.method === 'Cash') methodIcon = '🚗';
                    else if (p.method === 'Debit Card') methodIcon = '💳';

                    const methodDetail = p.cardLast4 ? `•••• ${p.cardLast4}` : (p.upiId || p.bankName || p.walletName || (p.method === 'Pay at Pickup' ? 'Pay upon collection' : p.method) || 'Online Payment');

                    return `
                      <tr id="payment-row-${p.id}">
                        <!-- Transaction ID -->
                        <td>
                          <div class="payment-id-pill" title="Payment Reference ID">${p.id}</div>
                        </td>

                        <!-- Vehicle & Linked Reservation -->
                        <td>
                          <div class="payment-car-name">${p.carName || 'Luxury Rental'}</div>
                          <div class="payment-booking-ref" onclick="App.navigateTo('#user-bookings')" title="View in My Bookings">
                            Reservation #${p.bookingId} ➔
                          </div>
                        </td>

                        <!-- Payment Method -->
                        <td>
                          <div class="payment-method-item">
                            <span class="payment-method-icon">${methodIcon}</span>
                            <div>
                              <div class="payment-method-name">${p.method || 'Credit Card'}</div>
                              <div class="payment-method-sub">${methodDetail}</div>
                            </div>
                          </div>
                        </td>

                        <!-- Date & Time -->
                        <td>
                          <div class="payment-date-text">${formatDateTime(p.date || p.createdAt)}</div>
                          ${p.refundDate ? `<div class="payment-refund-note">Refunded on ${formatDateTime(p.refundDate)}</div>` : ''}
                        </td>

                        <!-- Amount -->
                        <td>
                          <div class="payment-amount-val">${formatCurrency(p.amount)}</div>
                          <div class="payment-tax-tag">GST Inclusive</div>
                        </td>

                        <!-- Status Badge -->
                        <td>
                          <span class="payment-status-badge ${statusBadgeClass}">
                            <span class="status-pulse-dot"></span>
                            ${p.status || 'Paid'}
                          </span>
                        </td>

                        <!-- Invoice Action Button -->
                        <td style="text-align: right;">
                          <button class="btn btn-secondary btn-sm" onclick="Booking.openPrintReceipt('${p.bookingId}')" title="View official printable tax invoice">
                            🖨️ Tax Invoice
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}

                  ${filtered.length === 0 && payments.length > 0 ? `
                    <tr>
                      <td colspan="7" style="padding: 0;">
                        <div class="payment-empty-card">
                          <div class="payment-empty-icon">🔍</div>
                          <h3 class="payment-empty-title">No transactions found in this category.</h3>
                          <p class="payment-empty-sub">
                            ${this.paymentSearchQuery 
                              ? `No payments match "${this.paymentSearchQuery}".` 
                              : 'No payments found matching the selected status or method filter.'}
                          </p>
                          <button class="btn btn-secondary btn-sm" onclick="UserDash.resetPaymentFilters()" style="margin-top: 10px;">
                            Reset Filters & View All
                          </button>
                        </div>
                      </td>
                    </tr>
                  ` : ''}

                  ${payments.length === 0 ? `
                    <tr>
                      <td colspan="7" style="padding: 0;">
                        <div class="payment-empty-card">
                          <div class="empty-payment-glow"></div>
                          <div class="payment-empty-icon">💳</div>
                          <h3 class="payment-empty-title">No transactions yet</h3>
                          <p class="payment-empty-sub">Your rental payment history will appear here once you make your first vehicle reservation.</p>
                          <button class="btn btn-primary" onclick="App.navigateTo('#browse')" style="margin-top: 10px;">
                            <span>Explore Cars</span>
                            <span style="font-size: 1.1rem; line-height: 1;">➔</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="dash-content">
          <div class="glass-card" style="padding: 40px; text-align: center; border: 1px solid rgba(244, 63, 94, 0.3);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
            <h3 style="color: var(--rose); margin-bottom: 6px;">Error Loading Payments</h3>
            <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px;">${err.message || 'Unable to retrieve payment transaction history. Please try again.'}</p>
            <button class="btn btn-primary btn-sm" onclick="UserDash.renderPayments()">Try Again</button>
          </div>
        </div>
      `;
    }
  },

  setPaymentStatusFilter(status) {
    this.paymentStatusFilter = (status || 'all').toLowerCase();
    this.renderPayments();
  },

  resetPaymentFilters() {
    this.paymentStatusFilter = 'all';
    this.paymentSearchQuery = '';
    this.paymentMethodFilter = 'all';
    this.renderPayments();
  },

  filterPayments(payments) {
    let list = [...payments];

    // Status Filter
    const st = (this.paymentStatusFilter || 'all').toLowerCase();
    if (st !== 'all') {
      list = list.filter(p => (p.status || '').toLowerCase() === st);
    }

    // Method Filter
    if (this.paymentMethodFilter && this.paymentMethodFilter !== 'all') {
      list = list.filter(p => (p.method || '').toLowerCase() === this.paymentMethodFilter.toLowerCase());
    }

    // Search Query
    if (this.paymentSearchQuery && this.paymentSearchQuery.trim()) {
      const q = this.paymentSearchQuery.trim().toLowerCase();
      list = list.filter(p => 
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.bookingId && p.bookingId.toLowerCase().includes(q)) ||
        (p.carName && p.carName.toLowerCase().includes(q)) ||
        (p.method && p.method.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q))
      );
    }

    return list;
  },

  // 5. NOTIFICATIONS VIEW (Luxury Activity & Alert Center)
  async renderNotifications() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Polished Skeleton Loader
    container.innerHTML = `
      <div class="dash-content">
        <div class="dash-page-header-row" style="margin-bottom: 20px;">
          <div>
            <div class="skeleton" style="height: 32px; width: 240px; margin-bottom: 8px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="height: 18px; width: 380px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton" style="height: 42px; width: 160px; border-radius: var(--radius-md);"></div>
        </div>

        <!-- 4 KPI Summary Skeletons -->
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
        </div>

        <!-- Filter Bar Skeleton -->
        <div class="skeleton" style="height: 52px; border-radius: var(--radius-xl); margin-bottom: 20px;"></div>

        <!-- Notification List Skeletons -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="skeleton" style="height: 100px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 100px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;

    try {
      const res = await NotificationsAPI.getAll();
      const notifications = res.notifications || [];

      // Compute Real Authenticated Metrics
      const totalNotifs = notifications.length;
      const unreadCount = notifications.filter(n => !n.read).length;
      const bookingNotifs = notifications.filter(n => n.type === 'booking' || (n.title && n.title.toLowerCase().includes('booking'))).length;
      const promoPaymentNotifs = notifications.filter(n => ['payment', 'promo'].includes(n.type) || (n.title && (n.title.toLowerCase().includes('payment') || n.title.toLowerCase().includes('offer')))).length;

      const formatDateTime = (dateStr) => {
        if (!dateStr) return 'Just now';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${datePart} • ${timePart}`;
      };

      const filtered = this.filterNotifications(notifications);

      container.innerHTML = `
        <div class="dash-content">
          
          <!-- 1. LUXURY PAGE HEADER -->
          <div class="dash-page-header-row">
            <div>
              <div class="dash-page-badge" style="background: rgba(37, 99, 235, 0.1); color: var(--primary); border-color: rgba(37, 99, 235, 0.25);">
                <span class="badge-dot" style="background: var(--cyan); box-shadow: 0 0 6px var(--cyan);"></span>
                <span>Live Activity Center • ${unreadCount} Unread • ${totalNotifs} Total</span>
              </div>
              <h1 class="dash-page-title">Notifications</h1>
              <p class="dash-page-sub">Stay updated on your trip reminders, bookings, and exclusive discounts.</p>
            </div>
            <div class="dash-header-cta-group">
              ${unreadCount > 0 ? `
                <button class="btn btn-secondary" onclick="UserDash.markAllNotificationsRead()" id="notif-mark-all-cta">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Mark All Read</span>
                </button>
              ` : ''}
              <button class="btn btn-primary" onclick="App.navigateTo('#browse')" id="notif-explore-cta">
                <span>Explore Cars</span>
                <span style="font-size: 1.1rem; line-height: 1;">➔</span>
              </button>
            </div>
          </div>

          <!-- 2. 4 REAL-DATA NOTIFICATION SUMMARY KPI CARDS -->
          <div class="kpi-grid">
            
            <!-- 1. Total Notifications (Blue Accent) -->
            <div class="kpi-card kpi-card-blue glass-card" onclick="UserDash.setNotifFilter('all')" title="Filter: All Notifications">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </div>
                <span class="kpi-label">Total Notifications</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${totalNotifs}</div>
                <div class="kpi-sub-badge badge-blue">Activity Stream</div>
              </div>
            </div>

            <!-- 2. Unread Alerts (Amber/Orange Accent) -->
            <div class="kpi-card kpi-card-orange glass-card" onclick="UserDash.setNotifFilter('unread')" title="Filter: Unread Notifications">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <span class="kpi-label">Unread Alerts</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${unreadCount}</div>
                <div class="kpi-sub-badge badge-orange">Action Required</div>
              </div>
            </div>

            <!-- 3. Trips & Bookings (Emerald Accent) -->
            <div class="kpi-card kpi-card-emerald glass-card" onclick="UserDash.setNotifFilter('booking')" title="Filter: Trip Updates">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-emerald">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </div>
                <span class="kpi-label">Trip & Bookings</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${bookingNotifs}</div>
                <div class="kpi-sub-badge badge-emerald">Reservation Updates</div>
              </div>
            </div>

            <!-- 4. Offers & Payments (Purple Accent) -->
            <div class="kpi-card kpi-card-purple glass-card" onclick="UserDash.setNotifFilter('promo')" title="Filter: Offers & Payments">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <span class="kpi-label">Offers & Payments</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${promoPaymentNotifs}</div>
                <div class="kpi-sub-badge badge-purple">Privileges & Finance</div>
              </div>
            </div>

          </div>

          <!-- 3. FILTER BAR & SEARCH -->
          ${totalNotifs > 0 ? `
            <div class="notif-filters-bar glass-card">
              
              <!-- Filter Tabs -->
              <div class="notif-filter-tabs">
                ${[
                  { id: 'all', label: 'All Alerts', count: totalNotifs },
                  { id: 'unread', label: 'Unread', count: unreadCount },
                  { id: 'booking', label: 'Bookings', count: bookingNotifs },
                  { id: 'promo', label: 'Offers & Finance', count: promoPaymentNotifs }
                ].map(tab => `
                  <button class="notif-filter-pill ${this.notifFilter === tab.id ? 'active' : ''}" 
                          onclick="UserDash.setNotifFilter('${tab.id}')"
                          id="notif-filter-${tab.id}">
                    <span>${tab.label}</span>
                    <span class="filter-count-badge">${tab.count}</span>
                  </button>
                `).join('')}
              </div>

              <!-- Controls Right: Sort & Live Search -->
              <div class="notif-controls-right">
                
                <!-- Sort Dropdown -->
                <div class="fav-sort-wrap">
                  <select class="fav-sort-select" onchange="UserDash.notifSortOption = this.value; UserDash.renderNotifications();">
                    <option value="newest" ${this.notifSortOption === 'newest' ? 'selected' : ''}>Newest First</option>
                    <option value="oldest" ${this.notifSortOption === 'oldest' ? 'selected' : ''}>Oldest First</option>
                  </select>
                </div>

                <!-- Search Input -->
                <div class="booking-filter-search" style="width: 260px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" 
                         class="booking-search-input" 
                         placeholder="Search alerts, bookings..." 
                         value="${this.notifSearchQuery || ''}"
                         oninput="UserDash.notifSearchQuery = this.value; UserDash.renderNotifications();" 
                         id="notif-search-input" />
                  ${this.notifSearchQuery ? `
                    <button class="booking-search-clear" onclick="UserDash.notifSearchQuery = ''; UserDash.renderNotifications();" title="Clear search">✕</button>
                  ` : ''}
                </div>

              </div>

            </div>
          ` : ''}

          <!-- 4. NOTIFICATIONS CARDS LIST -->
          <div class="notif-cards-list">
            ${filtered.map(n => {
              const isUnread = !n.read;
              const type = n.type || 'system';

              let iconEmoji = '🔔';
              let iconClass = 'notif-icon-system';
              let typeLabel = 'System Alert';

              if (type === 'booking' || (n.title && n.title.toLowerCase().includes('booking'))) {
                iconEmoji = '🚗';
                iconClass = 'notif-icon-booking';
                typeLabel = 'Trip Update';
              } else if (type === 'payment' || (n.title && n.title.toLowerCase().includes('payment'))) {
                iconEmoji = '💳';
                iconClass = 'notif-icon-payment';
                typeLabel = 'Payment Received';
              } else if (type === 'promo' || (n.title && (n.title.toLowerCase().includes('offer') || n.title.toLowerCase().includes('discount')))) {
                iconEmoji = '🔥';
                iconClass = 'notif-icon-promo';
                typeLabel = 'Special Privilege';
              }

              const isBookingRef = n.message && n.message.includes('#BK-');
              const isPromoRef = type === 'promo' || (n.title && n.title.includes('Offer'));

              return `
                <div class="notif-item-card glass-card ${isUnread ? 'notif-unread' : ''}" id="notif-card-${n.id}">
                  
                  <!-- Left: Icon -->
                  <div class="notif-icon-box ${iconClass}">
                    <span>${iconEmoji}</span>
                  </div>

                  <!-- Body -->
                  <div class="notif-card-body">
                    <div class="notif-title-row">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <h4 class="notif-card-title">${n.title}</h4>
                        ${isUnread ? `<span class="notif-unread-dot" title="Unread alert"></span>` : ''}
                      </div>
                      <span class="notif-time-text">${formatDateTime(n.createdAt)}</span>
                    </div>

                    <p class="notif-card-msg">${n.message}</p>

                    <!-- Footer Meta & Actions -->
                    <div class="notif-card-footer">
                      <span class="notif-type-tag ${iconClass}">${typeLabel}</span>

                      <div class="notif-actions-group">
                        ${isUnread ? `
                          <button class="btn btn-secondary btn-sm" onclick="UserDash.markNotificationRead('${n.id}')" title="Mark as read">
                            ✓ Mark Read
                          </button>
                        ` : ''}

                        ${isBookingRef ? `
                          <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('#user-bookings')" title="View in My Bookings">
                            View Booking ➔
                          </button>
                        ` : (isPromoRef ? `
                          <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('#browse')" title="View Fleet">
                            View Offers ➔
                          </button>
                        ` : '')}

                        <button class="btn btn-icon btn-sm" onclick="UserDash.clearNotification('${n.id}')" title="Dismiss notification" style="color: var(--text-muted);">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}

            <!-- 5. EMPTY STATES -->
            ${totalNotifs === 0 ? `
              <!-- Zero Total Notifications -->
              <div class="notif-empty-card glass-card">
                <div class="empty-notif-glow"></div>
                <div class="notif-empty-icon">🔔</div>
                <h3 class="notif-empty-title">You're all caught up!</h3>
                <p class="notif-empty-sub">No active notifications or alerts at this time. We will keep you updated on upcoming trips and exclusive offers.</p>
                <button class="btn btn-primary" onclick="App.navigateTo('#browse')" style="margin-top: 10px;">
                  <span>Explore Fleet</span>
                  <span style="font-size: 1.1rem; line-height: 1;">➔</span>
                </button>
              </div>
            ` : (filtered.length === 0 ? `
              <!-- Filter Zero Matches -->
              <div class="notif-empty-card glass-card">
                <div class="notif-empty-icon">🔍</div>
                <h3 class="notif-empty-title">No notifications match your filter.</h3>
                <p class="notif-empty-sub">
                  ${this.notifSearchQuery 
                    ? `No alerts match "${this.notifSearchQuery}" under the selected category.` 
                    : 'No notifications found in this category.'}
                </p>
                <button class="btn btn-secondary" onclick="UserDash.resetNotifFilters()" style="margin-top: 10px;">
                  Reset Filters & View All
                </button>
              </div>
            ` : '')}

          </div>

        </div>
      `;

      this.updateNotificationBadge();
    } catch (err) {
      container.innerHTML = `
        <div class="dash-content">
          <div class="glass-card" style="padding: 40px; text-align: center; border: 1px solid rgba(244, 63, 94, 0.3);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
            <h3 style="color: var(--rose); margin-bottom: 6px;">Error Loading Notifications</h3>
            <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px;">${err.message || 'Unable to retrieve your alerts. Please try again.'}</p>
            <button class="btn btn-primary btn-sm" onclick="UserDash.renderNotifications()">Try Again</button>
          </div>
        </div>
      `;
    }
  },

  async markNotificationRead(id) {
    try {
      await NotificationsAPI.markRead(id);
      await this.renderNotifications();
      await this.updateNotificationBadge();
    } catch (err) {
      showToast('Error', err.message || 'Failed to mark as read.', 'error');
    }
  },

  async markAllNotificationsRead() {
    try {
      await NotificationsAPI.markAllRead();
      showToast('All Caught Up', 'All notifications have been marked as read.', 'success');
      await this.renderNotifications();
      await this.updateNotificationBadge();
    } catch (err) {
      showToast('Error', err.message || 'Failed to update notifications.', 'error');
    }
  },

  async clearNotification(id) {
    try {
      await NotificationsAPI.clear(id);
      await this.renderNotifications();
      await this.updateNotificationBadge();
    } catch (err) {
      showToast('Error', err.message || 'Failed to dismiss notification.', 'error');
    }
  },

  setNotifFilter(filter) {
    this.notifFilter = (filter || 'all').toLowerCase();
    this.renderNotifications();
  },

  resetNotifFilters() {
    this.notifFilter = 'all';
    this.notifSearchQuery = '';
    this.notifSortOption = 'newest';
    this.renderNotifications();
  },

  filterNotifications(notifications) {
    let list = [...notifications];

    // Filter type
    if (this.notifFilter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (this.notifFilter === 'booking') {
      list = list.filter(n => n.type === 'booking' || (n.title && n.title.toLowerCase().includes('booking')));
    } else if (this.notifFilter === 'promo') {
      list = list.filter(n => ['payment', 'promo'].includes(n.type) || (n.title && (n.title.toLowerCase().includes('payment') || n.title.toLowerCase().includes('offer'))));
    }

    // Search query
    if (this.notifSearchQuery && this.notifSearchQuery.trim()) {
      const q = this.notifSearchQuery.trim().toLowerCase();
      list = list.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.type && n.type.toLowerCase().includes(q))
      );
    }

    // Sort option
    if (this.notifSortOption === 'newest') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (this.notifSortOption === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return list;
  },

  // 6. REVIEWS VIEW (Luxury Automotive Driving Feedback & Ratings)
  async renderReviews() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Polished Skeleton Loader
    container.innerHTML = `
      <div class="dash-content">
        <div class="dash-page-header-row" style="margin-bottom: 20px;">
          <div>
            <div class="skeleton" style="height: 32px; width: 260px; margin-bottom: 8px; border-radius: var(--radius-sm);"></div>
            <div class="skeleton" style="height: 18px; width: 380px; border-radius: var(--radius-sm);"></div>
          </div>
          <div class="skeleton" style="height: 42px; width: 160px; border-radius: var(--radius-md);"></div>
        </div>

        <!-- 4 KPI Summary Skeletons -->
        <div class="kpi-grid" style="margin-bottom: 24px;">
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
          <div class="skeleton" style="height: 130px; border-radius: var(--radius-lg);"></div>
        </div>

        <!-- Filter Bar Skeleton -->
        <div class="skeleton" style="height: 52px; border-radius: var(--radius-xl); margin-bottom: 20px;"></div>

        <!-- Review Card Skeletons -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="skeleton" style="height: 180px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 180px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;

    try {
      const [reviews, bookings, cars] = await Promise.all([
        ReviewsAPI.getMy(),
        BookingsAPI.getAll(),
        State.cachedCars.length > 0 ? State.cachedCars : CarsAPI.getAll()
      ]);

      const carsMap = new Map((cars || []).map(c => [c.id, c]));

      // Attach car image & brand to review records
      const enrichedReviews = (reviews || []).map(r => {
        const car = carsMap.get(r.carId);
        return {
          ...r,
          carImage: car?.image || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
          carBrand: car?.brand || 'Luxury Fleet',
          carType: car?.type || 'Performance',
          carRating: car?.rating || 4.9
        };
      });

      // Compute Real Authenticated Metrics
      const totalReviews = enrichedReviews.length;
      const avgRating = totalReviews > 0
        ? (enrichedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
        : '5.0';
      const fiveStarCount = enrichedReviews.filter(r => Number(r.rating) === 5).length;
      const fourStarCount = enrichedReviews.filter(r => Number(r.rating) === 4).length;
      const threeStarCount = enrichedReviews.filter(r => Number(r.rating) <= 3).length;
      const verifiedCount = enrichedReviews.filter(r => r.status === 'Approved').length;

      // Filter and sort reviews
      const filtered = this.filterReviews(enrichedReviews);

      container.innerHTML = `
        <div class="dash-content">
          
          <!-- 1. LUXURY PAGE HEADER -->
          <div class="dash-page-header-row">
            <div>
              <div class="dash-page-badge" style="background: rgba(245, 158, 11, 0.1); color: var(--amber); border-color: rgba(245, 158, 11, 0.25);">
                <span class="badge-dot" style="background: var(--amber); box-shadow: 0 0 6px var(--amber);"></span>
                <span>Verified Driving Feedback • ${totalReviews} Reviews</span>
              </div>
              <h1 class="dash-page-title">My Reviews & Ratings</h1>
              <p class="dash-page-sub">Share your experience and manage your vehicle reviews.</p>
            </div>
            <div class="dash-header-cta-group">
              <button class="btn btn-secondary" onclick="UserDash.openWriteReviewModal()" id="my-reviews-write-cta">
                <span>★ Write a Review</span>
              </button>
              <button class="btn btn-primary" onclick="App.navigateTo('#browse')" id="my-reviews-explore-cta">
                <span>Explore Cars</span>
                <span style="font-size: 1.1rem; line-height: 1;">➔</span>
              </button>
            </div>
          </div>

          <!-- 2. 4 REAL-DATA REVIEW SUMMARY KPI CARDS -->
          <div class="kpi-grid">
            
            <!-- 1. Total Reviews (Blue Accent) -->
            <div class="kpi-card kpi-card-blue glass-card" onclick="UserDash.setReviewRatingFilter('all')" title="Filter: All Reviews">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span class="kpi-label">Total Reviews</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${totalReviews}</div>
                <div class="kpi-sub-badge badge-blue">Submitted Feedback</div>
              </div>
            </div>

            <!-- 2. Average Rating Given (Amber/Orange Accent) -->
            <div class="kpi-card kpi-card-orange glass-card" onclick="UserDash.setReviewRatingFilter('all')" title="Customer Average Score">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-orange">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <span class="kpi-label">Average Rating Given</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${avgRating} <span style="font-size: 1.1rem; color: var(--amber);">★</span></div>
                <div class="kpi-sub-badge badge-orange">Customer Score</div>
              </div>
            </div>

            <!-- 3. Five-Star Reviews (Emerald Accent) -->
            <div class="kpi-card kpi-card-emerald glass-card" onclick="UserDash.setReviewRatingFilter('5')" title="Filter: 5-Star Reviews">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-emerald">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <span class="kpi-label">Five-Star Reviews</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${fiveStarCount}</div>
                <div class="kpi-sub-badge badge-emerald">Top Rated Drives</div>
              </div>
            </div>

            <!-- 4. Verified Experiences (Purple Accent) -->
            <div class="kpi-card kpi-card-purple glass-card" onclick="UserDash.setReviewRatingFilter('all')" title="Verified Ratings">
              <div class="kpi-header">
                <div class="kpi-icon-wrap kpi-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <span class="kpi-label">Verified Ratings</span>
              </div>
              <div class="kpi-body">
                <div class="kpi-value">${verifiedCount}</div>
                <div class="kpi-sub-badge badge-purple">Community Impact</div>
              </div>
            </div>

          </div>

          <!-- 3. FILTER BAR & LIVE SEARCH -->
          ${totalReviews > 0 ? `
            <div class="review-filters-bar glass-card">
              
              <!-- Star Rating Filter Tabs -->
              <div class="review-filter-tabs">
                ${[
                  { id: 'all', label: 'All Reviews', count: totalReviews },
                  { id: '5', label: '5 Stars ★', count: fiveStarCount },
                  { id: '4', label: '4 Stars ★', count: fourStarCount },
                  { id: '3', label: '3 Stars & Below', count: threeStarCount }
                ].map(tab => `
                  <button class="review-filter-pill ${this.reviewRatingFilter === tab.id ? 'active' : ''}" 
                          onclick="UserDash.setReviewRatingFilter('${tab.id}')"
                          id="review-filter-${tab.id}">
                    <span>${tab.label}</span>
                    <span class="filter-count-badge">${tab.count}</span>
                  </button>
                `).join('')}
              </div>

              <!-- Controls Right: Sort & Live Search -->
              <div class="review-controls-right">
                
                <!-- Sort Dropdown -->
                <div class="fav-sort-wrap">
                  <select class="fav-sort-select" onchange="UserDash.reviewSortOption = this.value; UserDash.renderReviews();">
                    <option value="newest" ${this.reviewSortOption === 'newest' ? 'selected' : ''}>Newest First</option>
                    <option value="oldest" ${this.reviewSortOption === 'oldest' ? 'selected' : ''}>Oldest First</option>
                    <option value="rating-desc" ${this.reviewSortOption === 'rating-desc' ? 'selected' : ''}>Highest Rating</option>
                    <option value="rating-asc" ${this.reviewSortOption === 'rating-asc' ? 'selected' : ''}>Lowest Rating</option>
                  </select>
                </div>

                <!-- Search Input -->
                <div class="booking-filter-search" style="width: 260px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" 
                         class="booking-search-input" 
                         placeholder="Search vehicle, headline..." 
                         value="${this.reviewSearchQuery || ''}"
                         oninput="UserDash.reviewSearchQuery = this.value; UserDash.renderReviews();" 
                         id="review-search-input" />
                  ${this.reviewSearchQuery ? `
                    <button class="booking-search-clear" onclick="UserDash.reviewSearchQuery = ''; UserDash.renderReviews();" title="Clear search">✕</button>
                  ` : ''}
                </div>

              </div>

            </div>
          ` : ''}

          <!-- 4. REVIEWS LIST CONTAINER -->
          <div class="review-cards-list">
            ${filtered.map(r => {
              const safeCarName = (r.carName || 'Vehicle').replace(/'/g, "\\'");
              const safeTitle = (r.title || '').replace(/'/g, "\\'");
              const safeComment = (r.comment || '').replace(/'/g, "\\'").replace(/\n/g, ' ');
              const isApproved = r.status === 'Approved';

              const starRating = Number(r.rating) || 5;
              const starsHtml = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);

              return `
                <div class="review-item-card glass-card" id="review-card-${r.id}">
                  
                  <!-- Left: Vehicle Media Thumbnail -->
                  <div class="review-card-media" onclick="App.navigateTo('#car/${r.carId}')" title="View vehicle specifications">
                    <img src="${r.carImage}" alt="${r.carName}" class="review-card-thumb" loading="lazy" />
                    <span class="review-category-tag">${r.carType || 'Luxury'}</span>
                  </div>

                  <!-- Middle: Review Content & Rating Details -->
                  <div class="review-card-body">
                    
                    <div class="review-card-header">
                      <div class="review-title-wrap">
                        <div class="review-brand-label">${r.carBrand || 'DriveEase'} • ${r.carType || 'Luxury'}</div>
                        <h3 class="review-car-title" onclick="App.navigateTo('#car/${r.carId}')">${r.carName}</h3>
                      </div>

                      <!-- Star Rating Badge -->
                      <div class="review-stars-pill">
                        <span class="review-stars-gold">${starsHtml}</span>
                        <span class="review-score-num">${starRating}.0</span>
                      </div>
                    </div>

                    <!-- Review Headline -->
                    ${r.title ? `
                      <h4 class="review-headline">"${r.title}"</h4>
                    ` : ''}

                    <!-- Review Comment Text -->
                    <p class="review-comment-text">${r.comment}</p>

                    <!-- Review Footer Metadata & Status -->
                    <div class="review-meta-bar">
                      <div class="review-date-info">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>Submitted on ${formatDate(r.createdAt || r.date)}</span>
                        ${r.updatedAt ? `<span style="opacity: 0.7;">(Edited)</span>` : ''}
                      </div>

                      <div class="review-status-pill ${isApproved ? 'status-approved' : 'status-pending'}">
                        <span class="status-pulse-dot"></span>
                        <span>${isApproved ? 'Published & Verified' : 'Under Moderation'}</span>
                      </div>
                    </div>

                  </div>

                  <!-- Right: Contextual Action Buttons -->
                  <div class="review-card-side">
                    <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('#car/${r.carId}')" title="View car details">
                      View Car
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="UserDash.openReviewModal('${r.carId}', '${safeCarName}', '${r.id}', ${starRating}, '${safeTitle}', '${safeComment}')" title="Edit your review">
                      ✎ Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="UserDash.deleteReview('${r.id}', '${safeCarName}')" title="Delete this review">
                      🗑 Delete
                    </button>
                  </div>

                </div>
              `;
            }).join('')}

            <!-- 5. EMPTY STATES -->
            ${totalReviews === 0 ? `
              <!-- Zero Total Reviews -->
              <div class="review-empty-card glass-card">
                <div class="empty-review-glow"></div>
                <div class="review-empty-icon">⭐</div>
                <h3 class="review-empty-title">Your journey deserves a review.</h3>
                <p class="review-empty-sub">Share your experience with the cars you've driven and help fellow drivers discover exceptional rides.</p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 10px;">
                  <button class="btn btn-primary" onclick="UserDash.openWriteReviewModal()">
                    <span>Write a Review</span>
                    <span style="font-size: 1.1rem; line-height: 1;">➔</span>
                  </button>
                  <button class="btn btn-secondary" onclick="App.navigateTo('#browse')">
                    <span>Explore Fleet</span>
                  </button>
                </div>
              </div>
            ` : (filtered.length === 0 ? `
              <!-- Filter / Search Zero Matches -->
              <div class="review-empty-card glass-card">
                <div class="review-empty-icon">🔍</div>
                <h3 class="review-empty-title">No reviews match your filters.</h3>
                <p class="review-empty-sub">
                  ${this.reviewSearchQuery 
                    ? `No reviews match "${this.reviewSearchQuery}" under the selected rating filter.` 
                    : 'No reviews found in this star rating category.'}
                </p>
                <button class="btn btn-secondary" onclick="UserDash.resetReviewFilters()" style="margin-top: 10px;">
                  Reset Filters & View All
                </button>
              </div>
            ` : '')}

          </div>

        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="dash-content">
          <div class="glass-card" style="padding: 40px; text-align: center; border: 1px solid rgba(244, 63, 94, 0.3);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
            <h3 style="color: var(--rose); margin-bottom: 6px;">Error Loading Reviews</h3>
            <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px;">${err.message || 'Unable to retrieve your submitted feedback. Please try again.'}</p>
            <button class="btn btn-primary btn-sm" onclick="UserDash.renderReviews()">Try Again</button>
          </div>
        </div>
      `;
    }
  },

  async openWriteReviewModal() {
    try {
      const [bookings, cars] = await Promise.all([
        BookingsAPI.getAll(),
        State.cachedCars.length > 0 ? State.cachedCars : CarsAPI.getAll()
      ]);

      const eligibleBookings = (bookings || []).filter(b => ['Completed', 'Confirmed', 'Active'].includes(b.bookingStatus));
      
      const modalBody = document.getElementById('review-submit-modal-body');
      if (!modalBody) return;

      const carsMap = new Map((cars || []).map(c => [c.id, c]));

      let vehicleSelectHtml = '';
      if (eligibleBookings.length > 0) {
        const uniqueCars = [];
        const seen = new Set();
        for (const b of eligibleBookings) {
          if (!seen.has(b.carId)) {
            seen.add(b.carId);
            uniqueCars.push({ id: b.carId, name: b.carName || carsMap.get(b.carId)?.name || 'Vehicle' });
          }
        }
        vehicleSelectHtml = `
          <div class="form-group">
            <label class="form-label">SELECT DRIVEN VEHICLE</label>
            <select id="new-review-car-id" class="form-control" style="background: var(--bg-secondary); color: var(--text-primary);">
              ${uniqueCars.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        `;
      } else {
        vehicleSelectHtml = `
          <div class="form-group">
            <label class="form-label">SELECT VEHICLE</label>
            <select id="new-review-car-id" class="form-control" style="background: var(--bg-secondary); color: var(--text-primary);">
              ${(cars || []).map(c => `<option value="${c.id}">${c.name} (${c.type})</option>`).join('')}
            </select>
          </div>
        `;
      }

      modalBody.innerHTML = `
        ${vehicleSelectHtml}
        <div class="form-group">
          <label class="form-label">STAR RATING</label>
          <select id="new-review-rating" class="form-control" style="background: var(--bg-secondary); color: var(--text-primary);">
            <option value="5" selected>★★★★★ (5 Stars - Exceptional Experience)</option>
            <option value="4">★★★★☆ (4 Stars - Very Good)</option>
            <option value="3">★★★☆☆ (3 Stars - Average Experience)</option>
            <option value="2">★★☆☆☆ (2 Stars - Below Expectations)</option>
            <option value="1">★☆☆☆☆ (1 Star - Poor Experience)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">REVIEW HEADLINE</label>
          <input type="text" id="new-review-title" class="form-control" placeholder="e.g. Unbelievable acceleration and flawless handover!" style="background: var(--bg-secondary); color: var(--text-primary);" />
        </div>
        <div class="form-group">
          <label class="form-label">YOUR EXPERIENCE & FEEDBACK</label>
          <textarea id="new-review-comment" class="form-control" rows="4" placeholder="Share your experience regarding vehicle condition, pickup handover, luxury amenities, road performance..." style="background: var(--bg-secondary); color: var(--text-primary);"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
          <button class="btn btn-secondary" onclick="closeModal('review-submit-modal')">Cancel</button>
          <button class="btn btn-primary" id="btn-submit-review-action" onclick="UserDash.submitReview()">Publish Review ➔</button>
        </div>
      `;

      openModal('review-submit-modal');
    } catch (err) {
      showToast('Error', 'Unable to open review dialog: ' + err.message, 'error');
    }
  },

  openReviewModal(carId, carName, reviewId = null, initialRating = 5, initialTitle = '', initialComment = '') {
    const modalBody = document.getElementById('review-submit-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <input type="hidden" id="new-review-car-id" value="${carId}" />
      <div class="form-group">
        <label class="form-label">VEHICLE</label>
        <input type="text" class="form-control" value="${carName}" readonly style="opacity: 0.9; cursor: not-allowed; background: var(--bg-secondary); color: var(--text-primary);" />
      </div>
      <div class="form-group">
        <label class="form-label">STAR RATING</label>
        <select id="new-review-rating" class="form-control" style="background: var(--bg-secondary); color: var(--text-primary);">
          <option value="5" ${Number(initialRating) === 5 ? 'selected' : ''}>★★★★★ (5 Stars - Exceptional Experience)</option>
          <option value="4" ${Number(initialRating) === 4 ? 'selected' : ''}>★★★★☆ (4 Stars - Very Good)</option>
          <option value="3" ${Number(initialRating) === 3 ? 'selected' : ''}>★★★☆☆ (3 Stars - Average Experience)</option>
          <option value="2" ${Number(initialRating) === 2 ? 'selected' : ''}>★★☆☆☆ (2 Stars - Below Expectations)</option>
          <option value="1" ${Number(initialRating) === 1 ? 'selected' : ''}>★☆☆☆☆ (1 Star - Poor Experience)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">REVIEW HEADLINE</label>
        <input type="text" id="new-review-title" class="form-control" placeholder="e.g. Unbelievable acceleration and flawless handover!" value="${initialTitle || ''}" style="background: var(--bg-secondary); color: var(--text-primary);" />
      </div>
      <div class="form-group">
        <label class="form-label">YOUR EXPERIENCE & FEEDBACK</label>
        <textarea id="new-review-comment" class="form-control" rows="4" placeholder="Share your experience regarding vehicle condition, pickup handover, luxury amenities..." style="background: var(--bg-secondary); color: var(--text-primary);">${initialComment || ''}</textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
        <button class="btn btn-secondary" onclick="closeModal('review-submit-modal')">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-review-action" onclick="UserDash.submitReview('${carId}')">
          ${reviewId ? 'Save Changes ➔' : 'Publish Review ➔'}
        </button>
      </div>
    `;

    openModal('review-submit-modal');
  },

  async submitReview(carIdParam) {
    const carId = carIdParam || document.getElementById('new-review-car-id')?.value;
    const rating = document.getElementById('new-review-rating')?.value || 5;
    const title = document.getElementById('new-review-title')?.value?.trim();
    const comment = document.getElementById('new-review-comment')?.value?.trim();

    if (!carId) {
      showToast('Selection Required', 'Please select a vehicle to review.', 'warning');
      return;
    }

    if (!comment || comment.length < 5) {
      showToast('Comment Required', 'Please write at least 5 characters for your review comment.', 'warning');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-review-action');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      const res = await ReviewsAPI.submit({ carId, rating: Number(rating), title, comment });
      closeModal('review-submit-modal');
      showToast('Review Published', res.message || 'Thank you! Your verified review has been published.', 'success');
      await this.renderReviews();
    } catch (err) {
      showToast('Error', err.message || 'Failed to submit review.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Review ➔';
      }
    }
  },

  async deleteReview(reviewId, carName = 'this review') {
    if (!confirm(`Are you sure you want to delete your review for ${carName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await ReviewsAPI.delete(reviewId);
      showToast('Review Deleted', `Your review for ${carName} has been removed.`, 'info');
      await this.renderReviews();
    } catch (err) {
      showToast('Error', err.message || 'Unable to delete review.', 'error');
    }
  },

  setReviewRatingFilter(rating) {
    this.reviewRatingFilter = (rating || 'all').toLowerCase();
    this.renderReviews();
  },

  resetReviewFilters() {
    this.reviewRatingFilter = 'all';
    this.reviewSearchQuery = '';
    this.reviewSortOption = 'newest';
    this.renderReviews();
  },

  filterReviews(reviews) {
    let list = [...reviews];

    // Star Rating Filter
    if (this.reviewRatingFilter === '5') {
      list = list.filter(r => Number(r.rating) === 5);
    } else if (this.reviewRatingFilter === '4') {
      list = list.filter(r => Number(r.rating) === 4);
    } else if (this.reviewRatingFilter === '3') {
      list = list.filter(r => Number(r.rating) <= 3);
    }

    // Search Query
    if (this.reviewSearchQuery && this.reviewSearchQuery.trim()) {
      const q = this.reviewSearchQuery.trim().toLowerCase();
      list = list.filter(r =>
        (r.carName && r.carName.toLowerCase().includes(q)) ||
        (r.carBrand && r.carBrand.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.comment && r.comment.toLowerCase().includes(q))
      );
    }

    // Sort Option
    if (this.reviewSortOption === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    } else if (this.reviewSortOption === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
    } else if (this.reviewSortOption === 'rating-desc') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (this.reviewSortOption === 'rating-asc') {
      list.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0));
    }

    return list;
  },

  // 7. PROFILE VIEW — LUXURY AUTOMOTIVE CUSTOMER PROFILE & DRIVER CREDENTIALS
  async renderProfile() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Refresh user state from server if token is present
    try {
      if (State.token) {
        await AuthAPI.getMe();
      }
    } catch {
      // Use existing State.user fallback
    }

    const user = State.user || {};
    const avatarSrc = user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}&backgroundColor=0284c7,3b82f6,6366f1`;
    const membership = user.membership || (user.role === 'ADMIN' ? 'Fleet Super Administrator' : 'VIP Executive Member');
    const memberSince = user.createdAt ? formatDate(user.createdAt) : 'Jan 2025';
    const profileCompletion = user.profileCompletion || 85;
    const totalTrips = user.totalBookings || 0;
    const totalSpent = user.totalSpent || 0;
    const hasLicense = Boolean(user.licenseNumber && user.licenseNumber.trim());

    container.innerHTML = `
      <div class="dash-content">
        
        <!-- 1. PAGE HEADER -->
        <div class="dash-page-header-row" style="margin-bottom: 24px;">
          <div>
            <div class="dash-hero-badge" style="margin-bottom: 6px;">
              <span class="badge-dot" style="background: var(--emerald); box-shadow: 0 0 6px var(--emerald);"></span>
              <span>Account Security & Verification</span>
            </div>
            <h1 style="font-size: 1.85rem; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; color: var(--text-primary);">My Profile</h1>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">Manage your personal profile, verified driver credentials, and secure access keys.</p>
          </div>
          <div class="dash-page-header-actions">
            <div class="payment-status-badge status-paid" style="padding: 6px 14px;">
              <span class="status-pulse-dot"></span>
              <span>Verified Customer Profile</span>
            </div>
          </div>
        </div>

        <!-- 2. 4 LUXURY KPI METRIC CARDS -->
        <div class="kpi-grid" style="margin-bottom: 26px;">
          
          <!-- Profile Readiness (Cyan/Blue Accent) -->
          <div class="kpi-card kpi-card-blue glass-card">
            <div class="kpi-header">
              <div class="kpi-icon-wrap kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span class="kpi-label">Profile Readiness</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">${profileCompletion}%</div>
              <div class="kpi-sub-badge badge-blue">Express Key Handover</div>
            </div>
          </div>

          <!-- Membership Tier (Violet Accent) -->
          <div class="kpi-card kpi-card-purple glass-card">
            <div class="kpi-header">
              <div class="kpi-icon-wrap kpi-purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <span class="kpi-label">Tier Status</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value" style="font-size: 1.25rem;">${membership}</div>
              <div class="kpi-sub-badge badge-purple">Since ${memberSince}</div>
            </div>
          </div>

          <!-- Driver Credentials (Emerald Accent) -->
          <div class="kpi-card kpi-card-emerald glass-card">
            <div class="kpi-header">
              <div class="kpi-icon-wrap kpi-emerald">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 9h4"/><path d="M14 15h4"/></svg>
              </div>
              <span class="kpi-label">Driver Credentials</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value" style="font-size: 1.25rem;">${hasLicense ? 'Verified & On File' : 'Pending Upload'}</div>
              <div class="kpi-sub-badge badge-emerald">${user.licenseExpiry ? 'Valid Thru ' + formatDate(user.licenseExpiry) : 'Standard License'}</div>
            </div>
          </div>

          <!-- Fleet Experience (Amber Accent) -->
          <div class="kpi-card kpi-card-orange glass-card" onclick="App.navigateTo('#user-bookings')" style="cursor: pointer;">
            <div class="kpi-header">
              <div class="kpi-icon-wrap kpi-orange">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              </div>
              <span class="kpi-label">Fleet Experience</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">${totalTrips} ${totalTrips === 1 ? 'Trip' : 'Trips'}</div>
              <div class="kpi-sub-badge badge-orange">${formatCurrency(totalSpent)} Invoiced</div>
            </div>
          </div>

        </div>

        <!-- 3. MAIN 2-COLUMN PROFILE WORKSPACE -->
        <div class="profile-layout-grid">
          
          <!-- LEFT COLUMN: VIP IDENTITY PROFILE CARD -->
          <div class="profile-vip-card glass-card">
            <div class="profile-vip-glow"></div>

            <div class="profile-avatar-box">
              <img id="profile-avatar-preview" src="${avatarSrc}" alt="${user.name || 'User'}" class="profile-avatar-img" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'U')}'" />
              <div class="profile-avatar-badge" title="Verified Customer Identity">✓</div>
            </div>

            <h3 class="profile-user-name">${user.name || 'Customer'}</h3>
            <div class="profile-user-email-pill">${user.email || 'customer@example.com'}</div>
            <div>
              <span class="profile-tier-badge">👑 ${membership}</span>
            </div>

            <div class="profile-meta-list">
              <div class="profile-meta-row">
                <span class="profile-meta-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <div>
                  <span class="profile-meta-label">Customer ID:</span>
                  <span style="font-family: monospace; font-weight: 700; color: var(--cyan);">${user.id || 'usr_cust_01'}</span>
                </div>
              </div>

              <div class="profile-meta-row">
                <span class="profile-meta-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </span>
                <div>
                  <span class="profile-meta-label">Phone:</span>
                  <span>${user.phone || 'Not provided'}</span>
                </div>
              </div>

              <div class="profile-meta-row">
                <span class="profile-meta-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 9h4"/><path d="M14 15h4"/></svg>
                </span>
                <div>
                  <span class="profile-meta-label">License:</span>
                  <span>${user.licenseNumber || 'Not submitted'}</span>
                </div>
              </div>

              <div class="profile-meta-row">
                <span class="profile-meta-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </span>
                <div>
                  <span class="profile-meta-label">Address:</span>
                  <span>${user.address || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <!-- Identity Verification Status Card -->
            <div class="profile-verification-card">
              <div class="profile-verif-title">Verification Readiness</div>
              
              <div class="profile-verif-item">
                <span>Account Authenticated</span>
                <span class="profile-verif-status verif-active">✓ Active</span>
              </div>
              <div class="profile-verif-item">
                <span>Email Address Verified</span>
                <span class="profile-verif-status verif-active">✓ Verified</span>
              </div>
              <div class="profile-verif-item">
                <span>Driver License Credential</span>
                <span class="profile-verif-status ${hasLicense ? 'verif-active' : 'verif-pending'}">${hasLicense ? '✓ Verified' : '⚠ Required'}</span>
              </div>
              <div class="profile-verif-item">
                <span>Instant Fleet Key Access</span>
                <span class="profile-verif-status verif-active">✓ Ready</span>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: EDIT PROFILE & SECURITY FORMS -->
          <div class="profile-forms-column">
            
            <!-- FORM 1: PERSONAL & DRIVER CREDENTIALS -->
            <div class="profile-form-card glass-card">
              <div class="profile-card-header">
                <div class="profile-card-icon-wrap icon-wrap-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="profile-card-title-text">
                  <h3>Personal & Driver Credentials</h3>
                  <p>Update your personal information and driver credentials for express vehicle handover.</p>
                </div>
              </div>

              <!-- Inline Notification / Alert Message Container -->
              <div id="profile-msg-box" class="profile-msg-box"></div>

              <form id="profile-edit-form" onsubmit="UserDash.handleProfileSave(event)">
                
                <div class="profile-form-grid-2">
                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-name">
                      <span>Full Name</span>
                      <span class="required-dot">* Required</span>
                    </label>
                    <input type="text" id="prof-name" class="profile-input-control" value="${user.name || ''}" placeholder="e.g. John Doe" required />
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-email">
                      <span>Email Address</span>
                      <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">Account Identifier</span>
                    </label>
                    <div class="profile-input-readonly-wrap">
                      <input type="email" id="prof-email" class="profile-input-control" value="${user.email || ''}" readonly disabled title="Email is locked to your account security identity." />
                      <span class="profile-lock-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="profile-form-grid-2">
                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-phone">
                      <span>Phone Number</span>
                    </label>
                    <input type="tel" id="prof-phone" class="profile-input-control" value="${user.phone || ''}" placeholder="+91 98234 56789" />
                    <span class="profile-input-hint">Used for 24/7 Roadside Assistance & SMS pickup alerts.</span>
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-address">
                      <span>Residential / Billing Address</span>
                    </label>
                    <input type="text" id="prof-address" class="profile-input-control" value="${user.address || ''}" placeholder="Street, City, State, PIN" />
                  </div>
                </div>

                <div class="profile-form-grid-2">
                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-license">
                      <span>Driving License Number</span>
                    </label>
                    <input type="text" id="prof-license" class="profile-input-control" value="${user.licenseNumber || ''}" placeholder="e.g. MH-01-2018-0094821" style="text-transform: uppercase;" />
                    <span class="profile-input-hint">Required for self-drive vehicle release.</span>
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-license-exp">
                      <span>License Expiry Date</span>
                    </label>
                    <input type="date" id="prof-license-exp" class="profile-input-control" value="${user.licenseExpiry ? user.licenseExpiry.substring(0, 10) : ''}" />
                  </div>
                </div>

                <div class="profile-input-group" style="margin-top: 6px;">
                  <label class="profile-input-label" for="prof-avatar">
                    <span>Profile Avatar Image URL</span>
                  </label>
                  <input type="url" id="prof-avatar" class="profile-input-control" value="${user.avatar || ''}" placeholder="https://..." oninput="UserDash.previewAvatarUrl(this.value)" />
                </div>

                <!-- Avatar Quick Presets -->
                <div class="profile-avatar-presets">
                  <div class="profile-presets-title">
                    <span>Quick Select Avatar Preset</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">Click to apply</span>
                  </div>
                  <div class="profile-presets-row">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" alt="Executive 1" class="profile-preset-thumb" onclick="UserDash.setPresetAvatar('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', this)" title="Executive Portrait" />
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" alt="Executive 2" class="profile-preset-thumb" onclick="UserDash.setPresetAvatar('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', this)" title="Business Portrait" />
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" alt="Executive 3" class="profile-preset-thumb" onclick="UserDash.setPresetAvatar('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', this)" title="Modern Driver" />
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Executive 4" class="profile-preset-thumb" onclick="UserDash.setPresetAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', this)" title="Luxury Pilot" />
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}&backgroundColor=0284c7,3b82f6,6366f1" alt="Initials Avatar" class="profile-preset-thumb" onclick="UserDash.setPresetAvatar('https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}&backgroundColor=0284c7,3b82f6,6366f1', this)" title="Initials Avatar" />
                  </div>
                </div>

                <div class="profile-form-actions">
                  <div class="profile-form-actions-left">
                    <button type="submit" id="btn-save-profile" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      <span>Save Profile Changes</span>
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="UserDash.renderProfile()">Discard Changes</button>
                  </div>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">Protected by 256-Bit SSL Encryption</span>
                </div>

              </form>
            </div>

            <!-- FORM 2: PASSWORD & SECURITY -->
            <div class="profile-form-card glass-card">
              <div class="profile-card-header">
                <div class="profile-card-icon-wrap icon-wrap-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div class="profile-card-title-text">
                  <h3>Account Security & Password</h3>
                  <p>Update your account access password securely using industry-standard bcrypt hashing.</p>
                </div>
              </div>

              <!-- Inline Security Alert / Message Container -->
              <div id="password-msg-box" class="profile-msg-box"></div>

              <form id="password-change-form" onsubmit="UserDash.handlePasswordChange(event)">
                <div class="profile-form-grid-3">
                  
                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-cur-pass">
                      <span>Current Password</span>
                      <span class="required-dot">*</span>
                    </label>
                    <div class="profile-pass-wrap">
                      <input type="password" id="prof-cur-pass" class="profile-input-control" placeholder="••••••••" required />
                      <button type="button" class="profile-pass-toggle-btn" onclick="UserDash.togglePassVisibility('prof-cur-pass', this)" title="Show/Hide Password">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-new-pass">
                      <span>New Password</span>
                      <span class="required-dot">*</span>
                    </label>
                    <div class="profile-pass-wrap">
                      <input type="password" id="prof-new-pass" class="profile-input-control" placeholder="Min 6 characters" minlength="6" required />
                      <button type="button" class="profile-pass-toggle-btn" onclick="UserDash.togglePassVisibility('prof-new-pass', this)" title="Show/Hide Password">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="prof-conf-pass">
                      <span>Confirm New Password</span>
                      <span class="required-dot">*</span>
                    </label>
                    <div class="profile-pass-wrap">
                      <input type="password" id="prof-conf-pass" class="profile-input-control" placeholder="Repeat new password" minlength="6" required />
                      <button type="button" class="profile-pass-toggle-btn" onclick="UserDash.togglePassVisibility('prof-conf-pass', this)" title="Show/Hide Password">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </div>

                </div>

                <div class="profile-form-actions">
                  <button type="submit" id="btn-update-password" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>Update Password</span>
                  </button>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">Passwords must be at least 6 characters in length.</span>
                </div>

              </form>
            </div>

          </div>

        </div>

      </div>
    `;
  },

  setPresetAvatar(url, thumbEl) {
    const input = document.getElementById('prof-avatar');
    if (input) {
      input.value = url;
    }
    const preview = document.getElementById('profile-avatar-preview');
    if (preview) {
      preview.src = url;
    }
    document.querySelectorAll('.profile-preset-thumb').forEach(el => el.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  },

  previewAvatarUrl(url) {
    const preview = document.getElementById('profile-avatar-preview');
    if (preview && url && url.trim().startsWith('http')) {
      preview.src = url.trim();
    }
  },

  togglePassVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btnEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
      `;
    } else {
      input.type = 'password';
      btnEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      `;
    }
  },

  async handleProfileSave(event) {
    if (event) event.preventDefault();

    const btn = document.getElementById('btn-save-profile');
    const msgBox = document.getElementById('profile-msg-box');

    const name = document.getElementById('prof-name')?.value?.trim();
    const phone = document.getElementById('prof-phone')?.value?.trim() || '';
    const address = document.getElementById('prof-address')?.value?.trim() || '';
    const licenseNumber = document.getElementById('prof-license')?.value?.trim() || '';
    const licenseExpiry = document.getElementById('prof-license-exp')?.value || '';
    const avatar = document.getElementById('prof-avatar')?.value?.trim() || '';

    if (!name) {
      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-error';
        msgBox.textContent = 'Full name is required.';
      }
      showToast('Validation Error', 'Full name is required.', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Saving Changes...</span>';
    }

    try {
      const res = await AuthAPI.updateProfile({
        name,
        phone,
        address,
        licenseNumber,
        licenseExpiry,
        avatar
      });

      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-success';
        msgBox.textContent = '✓ Profile details saved successfully!';
      }

      showToast('Profile Updated', 'Your profile details have been successfully saved.', 'success');
      
      // Update header pill and re-render profile
      this.renderHeader();
      await this.renderProfile();
    } catch (err) {
      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-error';
        msgBox.textContent = err.message || 'Failed to update profile.';
      }
      showToast('Update Failed', err.message || 'Failed to update profile.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save Profile Changes</span>
        `;
      }
    }
  },

  async handlePasswordChange(event) {
    if (event) event.preventDefault();

    const btn = document.getElementById('btn-update-password');
    const msgBox = document.getElementById('password-msg-box');

    const curPass = document.getElementById('prof-cur-pass')?.value;
    const newPass = document.getElementById('prof-new-pass')?.value;
    const confPass = document.getElementById('prof-conf-pass')?.value;

    if (!curPass) {
      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-error';
        msgBox.textContent = 'Please enter your current password.';
      }
      showToast('Password Error', 'Please enter your current password.', 'error');
      return;
    }

    if (!newPass || newPass.length < 6) {
      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-error';
        msgBox.textContent = 'New password must be at least 6 characters long.';
      }
      showToast('Password Error', 'New password must be at least 6 characters long.', 'error');
      return;
    }

    if (newPass !== confPass) {
      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-error';
        msgBox.textContent = 'New password and confirm password do not match.';
      }
      showToast('Password Error', 'New passwords do not match.', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Updating Password...</span>';
    }

    try {
      await AuthAPI.updatePassword(curPass, newPass);

      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-success';
        msgBox.textContent = '✓ Password updated securely!';
      }

      showToast('Password Updated', 'Your password has been changed successfully.', 'success');

      // Clear password form fields
      const c = document.getElementById('prof-cur-pass');
      const n = document.getElementById('prof-new-pass');
      const conf = document.getElementById('prof-conf-pass');
      if (c) c.value = '';
      if (n) n.value = '';
      if (conf) conf.value = '';
    } catch (err) {
      if (msgBox) {
        msgBox.className = 'profile-msg-box msg-error';
        msgBox.textContent = err.message || 'Failed to update password.';
      }
      showToast('Update Failed', err.message || 'Failed to update password.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Update Password</span>
        `;
      }
    }
  },

  // Backward compatibility aliases
  async saveProfile() {
    return this.handleProfileSave();
  },

  async changePassword() {
    return this.handlePasswordChange();
  },

  // 8. SETTINGS VIEW — LUXURY AUTOMOTIVE PREFERENCES & ACCOUNT CONTROLS
  async renderSettings() {
    const container = document.getElementById('user-main-view');
    if (!container) return;

    // Fetch latest user preferences from backend
    let userPrefs = {
      theme: State.theme || 'dark',
      emailNotifications: true,
      smsNotifications: true,
      marketingOffers: true,
      securityAlerts: true,
      currency: 'INR',
      unitSystem: 'metric',
      language: 'English'
    };

    try {
      if (State.token) {
        const res = await AuthAPI.getPreferences();
        if (res && res.preferences) {
          userPrefs = { ...userPrefs, ...res.preferences };
        }
      }
    } catch {
      // Fallback to local State preferences
      if (State.user && State.user.preferences) {
        userPrefs = { ...userPrefs, ...State.user.preferences };
      }
    }

    const user = State.user || {};
    const membership = user.membership || (user.role === 'ADMIN' ? 'Fleet Administrator' : 'VIP Executive Member');
    const memberSince = user.createdAt ? formatDate(user.createdAt) : 'Jan 2025';
    const currentTheme = State.theme || userPrefs.theme || 'dark';

    container.innerHTML = `
      <div class="dash-content">
        
        <!-- 1. PAGE HEADER -->
        <div class="dash-page-header-row" style="margin-bottom: 24px;">
          <div>
            <div class="dash-hero-badge" style="margin-bottom: 6px;">
              <span class="badge-dot" style="background: var(--cyan); box-shadow: 0 0 6px var(--cyan);"></span>
              <span>Platform Preferences & Experience Controls</span>
            </div>
            <h1 style="font-size: 1.85rem; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; color: var(--text-primary);">Account Settings</h1>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">Customize your visual theme, alert delivery channels, regional units, and account security posture.</p>
          </div>
          <div class="dash-page-header-actions">
            <div class="payment-status-badge status-paid" style="padding: 6px 14px;">
              <span class="status-pulse-dot"></span>
              <span>Session Authenticated</span>
            </div>
          </div>
        </div>

        <!-- 2. MAIN 2-COLUMN SETTINGS WORKSPACE -->
        <div class="settings-layout-grid">
          
          <!-- LEFT SIDE: THEME SELECTOR + ACCOUNT INFO + SECURITY SNAPSHOT -->
          <div class="settings-side-column">
            
            <!-- THEME & APPEARANCE CARD -->
            <div class="settings-card glass-card">
              <div class="settings-card-header">
                <div class="settings-icon-wrap icon-wrap-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                </div>
                <div class="settings-card-title">
                  <h3>Interface Theme</h3>
                  <p>Choose your preferred dashboard appearance.</p>
                </div>
              </div>

              <div class="settings-theme-grid">
                <!-- Dark Mode Option -->
                <div class="settings-theme-card ${currentTheme === 'dark' ? 'active' : ''}" onclick="UserDash.setThemePreference('dark', this)">
                  <div class="theme-card-preview preview-dark">
                    <div class="preview-sidebar"></div>
                    <div class="preview-body">
                      <div class="preview-line"></div>
                      <div class="preview-accent"></div>
                    </div>
                  </div>
                  <div class="theme-card-info">
                    <span class="theme-name">Midnight Navy</span>
                    <span class="theme-check-dot">${currentTheme === 'dark' ? '✓' : ''}</span>
                  </div>
                </div>

                <!-- Light Mode Option -->
                <div class="settings-theme-card ${currentTheme === 'light' ? 'active' : ''}" onclick="UserDash.setThemePreference('light', this)">
                  <div class="theme-card-preview preview-light">
                    <div class="preview-sidebar"></div>
                    <div class="preview-body">
                      <div class="preview-line"></div>
                      <div class="preview-accent"></div>
                    </div>
                  </div>
                  <div class="theme-card-info">
                    <span class="theme-name">Slate Light</span>
                    <span class="theme-check-dot">${currentTheme === 'light' ? '✓' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ACCOUNT INFORMATION SNAPSHOT CARD -->
            <div class="settings-card glass-card">
              <div class="settings-card-header">
                <div class="settings-icon-wrap icon-wrap-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="settings-card-title">
                  <h3>Account Information</h3>
                  <p>Account identity and verified status.</p>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.82rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted); font-weight: 600;">Account ID:</span>
                  <span style="font-family: monospace; font-weight: 700; color: var(--cyan);">${user.id || 'usr_cust_01'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted); font-weight: 600;">Account Role:</span>
                  <span class="badge badge-primary">${user.role || 'CUSTOMER'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted); font-weight: 600;">Primary Email:</span>
                  <span style="font-weight: 600; color: var(--text-primary); max-width: 170px; overflow: hidden; text-overflow: ellipsis;">${user.email || 'customer@example.com'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-muted); font-weight: 600;">Tier Status:</span>
                  <span style="font-weight: 700; color: var(--amber);">👑 ${membership}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: var(--text-muted); font-weight: 600;">Member Since:</span>
                  <span style="font-weight: 600; color: var(--text-primary);">${memberSince}</span>
                </div>
              </div>

              <div class="settings-security-tile" onclick="App.navigateTo('#user-profile')" title="Go to My Profile">
                <div class="settings-security-tile-left">
                  <span style="font-size: 1.1rem;">👤</span>
                  <div>
                    <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-primary);">Personal Details & Driver License</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">Manage name, phone, address & license</div>
                  </div>
                </div>
                <span style="color: var(--primary); font-size: 0.9rem;">➔</span>
              </div>
            </div>

            <!-- SECURITY & CREDENTIALS SNAPSHOT CARD -->
            <div class="settings-card glass-card">
              <div class="settings-card-header">
                <div class="settings-icon-wrap" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div class="settings-card-title">
                  <h3>Security & Access Keys</h3>
                  <p>Encrypted password & authorization status.</p>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.8rem; color: var(--text-secondary);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Password Status:</span>
                  <span style="color: var(--emerald); font-weight: 700;">✓ Bcrypt Protected</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Data Encryption:</span>
                  <span style="color: var(--cyan); font-weight: 700;">256-Bit SSL/TLS</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span>Session Type:</span>
                  <span style="font-family: monospace; font-weight: 700; color: var(--text-primary);">JWT Bearer</span>
                </div>
              </div>

              <div class="settings-security-tile" onclick="App.navigateTo('#user-profile')" title="Go to My Profile Password Management">
                <div class="settings-security-tile-left">
                  <span style="font-size: 1.1rem;">🔒</span>
                  <div>
                    <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-primary);">Update Password</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">Change account password securely</div>
                  </div>
                </div>
                <span style="color: var(--primary); font-size: 0.9rem;">➔</span>
              </div>
            </div>

          </div>

          <!-- RIGHT SIDE: NOTIFICATION DELIVERY PREFERENCES + REGIONAL PREFERENCES -->
          <div class="settings-main-column">
            
            <!-- CARD 1: NOTIFICATION DELIVERY CHANNELS -->
            <div class="settings-card glass-card">
              <div class="settings-card-header">
                <div class="settings-icon-wrap icon-wrap-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </div>
                <div class="settings-card-title">
                  <h3>Notification Delivery Preferences</h3>
                  <p>Choose which updates, reminders, and alerts you wish to receive.</p>
                </div>
              </div>

              <div id="settings-notif-msg" class="settings-msg-box"></div>

              <form onsubmit="UserDash.handleNotificationPreferencesSave(event)">
                <div class="settings-switch-list">
                  
                  <!-- Switch 1: Booking Confirmations -->
                  <div class="settings-switch-item">
                    <div class="settings-switch-info">
                      <div class="settings-switch-icon">📅</div>
                      <div>
                        <div class="settings-switch-title">Booking Confirmations & Invoices (Email & Push)</div>
                        <p class="settings-switch-desc">Receive instant booking receipts, pickup instructions, and vehicle return inspection logs.</p>
                      </div>
                    </div>
                    <label class="settings-switch" aria-label="Toggle Booking Confirmations">
                      <input type="checkbox" id="pref-email-notif" ${userPrefs.emailNotifications ? 'checked' : ''} />
                      <span class="settings-slider"></span>
                    </label>
                  </div>

                  <!-- Switch 2: SMS Pickup Alerts -->
                  <div class="settings-switch-item">
                    <div class="settings-switch-info">
                      <div class="settings-switch-icon">📱</div>
                      <div>
                        <div class="settings-switch-title">Trip Reminders & Key Handover (SMS / WhatsApp)</div>
                        <p class="settings-switch-desc">Receive instant SMS alerts 2 hours prior to rental pickup with live vehicle stall location and concierge direct line.</p>
                      </div>
                    </div>
                    <label class="settings-switch" aria-label="Toggle SMS Pickup Alerts">
                      <input type="checkbox" id="pref-sms-notif" ${userPrefs.smsNotifications ? 'checked' : ''} />
                      <span class="settings-slider"></span>
                    </label>
                  </div>

                  <!-- Switch 3: Promotional & VIP Privilege Alerts -->
                  <div class="settings-switch-item">
                    <div class="settings-switch-info">
                      <div class="settings-switch-icon">🏷️</div>
                      <div>
                        <div class="settings-switch-title">Promotional Privileges & Supercar Discounts</div>
                        <p class="settings-switch-desc">Exclusive notifications for weekend super-car discounts, promotional coupon codes, and private fleet arrivals.</p>
                      </div>
                    </div>
                    <label class="settings-switch" aria-label="Toggle Promotional Privileges">
                      <input type="checkbox" id="pref-promo-notif" ${userPrefs.marketingOffers ? 'checked' : ''} />
                      <span class="settings-slider"></span>
                    </label>
                  </div>

                  <!-- Switch 4: Security Alerts -->
                  <div class="settings-switch-item">
                    <div class="settings-switch-info">
                      <div class="settings-switch-icon">🛡️</div>
                      <div>
                        <div class="settings-switch-title">Account Security & Access Notices</div>
                        <p class="settings-switch-desc">Instant notification whenever a new device signs in or sensitive profile credentials are updated.</p>
                      </div>
                    </div>
                    <label class="settings-switch" aria-label="Toggle Security Alerts">
                      <input type="checkbox" id="pref-sec-notif" ${userPrefs.securityAlerts ? 'checked' : ''} />
                      <span class="settings-slider"></span>
                    </label>
                  </div>

                </div>

                <div class="profile-form-actions" style="margin-top: 20px;">
                  <button type="submit" id="btn-save-notif-prefs" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    <span>Save Notification Preferences</span>
                  </button>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">Persisted to your authenticated profile</span>
                </div>
              </form>
            </div>

            <!-- CARD 2: REGIONAL & EXPERIENCE FORMATS -->
            <div class="settings-card glass-card">
              <div class="settings-card-header">
                <div class="settings-icon-wrap icon-wrap-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="settings-card-title">
                  <h3>Regional & Fleet Experience</h3>
                  <p>Configure currency display and speed measurement units.</p>
                </div>
              </div>

              <div id="settings-regional-msg" class="settings-msg-box"></div>

              <form onsubmit="UserDash.handleRegionalPreferencesSave(event)">
                <div class="profile-form-grid-3">
                  
                  <div class="profile-input-group">
                    <label class="profile-input-label" for="pref-currency">
                      <span>Display Currency</span>
                    </label>
                    <select id="pref-currency" class="profile-input-control">
                      <option value="INR" ${userPrefs.currency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
                      <option value="USD" ${userPrefs.currency === 'USD' ? 'selected' : ''}>USD ($ - US Dollar)</option>
                      <option value="EUR" ${userPrefs.currency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
                      <option value="GBP" ${userPrefs.currency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
                    </select>
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="pref-units">
                      <span>Measurement Units</span>
                    </label>
                    <select id="pref-units" class="profile-input-control">
                      <option value="metric" ${userPrefs.unitSystem === 'metric' ? 'selected' : ''}>Metric (km / kmph)</option>
                      <option value="imperial" ${userPrefs.unitSystem === 'imperial' ? 'selected' : ''}>Imperial (miles / mph)</option>
                    </select>
                  </div>

                  <div class="profile-input-group">
                    <label class="profile-input-label" for="pref-lang">
                      <span>Interface Language</span>
                    </label>
                    <select id="pref-lang" class="profile-input-control">
                      <option value="English" ${userPrefs.language === 'English' ? 'selected' : ''}>English (Global / EN)</option>
                      <option value="Hindi" ${userPrefs.language === 'Hindi' ? 'selected' : ''}>Hindi (हिन्दी / HI)</option>
                    </select>
                  </div>

                </div>

                <div class="profile-form-actions" style="margin-top: 14px;">
                  <button type="submit" id="btn-save-regional-prefs" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    <span>Save Regional Preferences</span>
                  </button>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">Default currency: INR (₹)</span>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>
    `;
  },

  async setThemePreference(theme, cardEl) {
    App.applyTheme(theme);
    
    // Update active states on cards
    document.querySelectorAll('.settings-theme-card').forEach(el => {
      el.classList.remove('active');
      const dot = el.querySelector('.theme-check-dot');
      if (dot) dot.textContent = '';
    });

    if (cardEl) {
      cardEl.classList.add('active');
      const dot = cardEl.querySelector('.theme-check-dot');
      if (dot) dot.textContent = '✓';
    }

    // Persist to server if logged in
    try {
      if (State.token) {
        await AuthAPI.updatePreferences({ theme });
      }
      showToast('Theme Updated', `Interface appearance set to ${theme === 'dark' ? 'Midnight Navy' : 'Slate Light'}.`, 'success');
      this.renderHeader();
    } catch (err) {
      console.warn('Theme preference sync warning:', err);
    }
  },

  async handleNotificationPreferencesSave(event) {
    if (event) event.preventDefault();

    const btn = document.getElementById('btn-save-notif-prefs');
    const msgBox = document.getElementById('settings-notif-msg');

    const emailNotifications = document.getElementById('pref-email-notif')?.checked ?? true;
    const smsNotifications = document.getElementById('pref-sms-notif')?.checked ?? true;
    const marketingOffers = document.getElementById('pref-promo-notif')?.checked ?? true;
    const securityAlerts = document.getElementById('pref-sec-notif')?.checked ?? true;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Saving Preferences...</span>';
    }

    try {
      await AuthAPI.updatePreferences({
        emailNotifications,
        smsNotifications,
        marketingOffers,
        securityAlerts
      });

      if (msgBox) {
        msgBox.className = 'settings-msg-box msg-success';
        msgBox.textContent = '✓ Notification delivery preferences successfully saved!';
      }

      showToast('Preferences Saved', 'Your notification channels have been updated.', 'success');
    } catch (err) {
      if (msgBox) {
        msgBox.className = 'settings-msg-box msg-error';
        msgBox.textContent = err.message || 'Failed to save preferences.';
      }
      showToast('Save Failed', err.message || 'Failed to save preferences.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save Notification Preferences</span>
        `;
      }
    }
  },

  async handleRegionalPreferencesSave(event) {
    if (event) event.preventDefault();

    const btn = document.getElementById('btn-save-regional-prefs');
    const msgBox = document.getElementById('settings-regional-msg');

    const currency = document.getElementById('pref-currency')?.value || 'INR';
    const unitSystem = document.getElementById('pref-units')?.value || 'metric';
    const language = document.getElementById('pref-lang')?.value || 'English';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Saving Preferences...</span>';
    }

    try {
      await AuthAPI.updatePreferences({
        currency,
        unitSystem,
        language
      });

      if (msgBox) {
        msgBox.className = 'settings-msg-box msg-success';
        msgBox.textContent = '✓ Regional & experience formats saved successfully!';
      }

      showToast('Preferences Saved', 'Your regional and fleet formats have been updated.', 'success');
    } catch (err) {
      if (msgBox) {
        msgBox.className = 'settings-msg-box msg-error';
        msgBox.textContent = err.message || 'Failed to save regional preferences.';
      }
      showToast('Save Failed', err.message || 'Failed to save regional preferences.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Save Regional Preferences</span>
        `;
      }
    }
  }
};
