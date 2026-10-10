// DriveEase - Landing Page Controller (Unified Single Luxury Page with Instant Fleet Filtering)

const Landing = {
  currentFleetIndex: 0,
  allCars: [],
  selectedCategory: 'All',

  initialized: false,

  handleQuickBookingClick() {
    if (!State.token || !State.user) {
      showToast('Login Required', 'Please log in to book a car.', 'info');
      App.openAuthModal('signin');
      return;
    }
    this.scrollToSection('booking-bar-widget');
  },

  async init() {
    if (!this.initialized) {
      this.bindEvents();
      this.renderTestimonials();
      this.renderFAQ();
      this.initialized = true;
    }
    await this.loadAllCars();
  },

  bindEvents() {
    // Fast Search Booking Widget Submit
    const widgetForm = document.getElementById('hero-booking-widget-form');
    if (widgetForm) {
      widgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pickupLoc = document.getElementById('widget-pickup-loc')?.value || 'Mumbai Airport (BOM)';
        const returnLoc = document.getElementById('widget-return-loc')?.value || 'Same as Pickup';
        const pickupDate = document.getElementById('widget-pickup-date')?.value || '';
        const returnDate = document.getElementById('widget-return-date')?.value || '';

        // Store selected search context in session
        sessionStorage.setItem('driveease_search_context', JSON.stringify({
          pickupLoc,
          returnLoc,
          pickupDate,
          returnDate,
          carType: 'All'
        }));

        showToast('Dates Applied', `Showing available cars for ${pickupDate || 'selected dates'}`, 'info');
        this.scrollToSection('featured-fleet');
        this.filterFleet('All');
      });
    }

    // Default dates in booking widget: tomorrow and 3 days later
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnDay = new Date(today);
    returnDay.setDate(returnDay.getDate() + 4);

    const todayStr = toISODateString(today);
    const defPickup = toISODateString(tomorrow);
    const defReturn = toISODateString(returnDay);

    const pWidget = document.getElementById('widget-pickup-date');
    const rWidget = document.getElementById('widget-return-date');
    if (pWidget) {
      pWidget.min = todayStr;
      pWidget.value = defPickup;
    }
    if (rWidget) {
      rWidget.min = defPickup;
      rWidget.value = defReturn;
    }
  },

  // Smooth scroll helper for header links (Browse Cars, Why DriveEase, How It Works, Offers, Reviews, FAQ)
  scrollToSection(sectionId) {
    const performScroll = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        const headerOffset = 80;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }
    };

    // Ensure public home section is visible
    const publicView = document.getElementById('view-public');
    const homeSection = document.getElementById('public-home-section');
    const browseSection = document.getElementById('public-browse-section');
    const userDashView = document.getElementById('view-user-dash');
    const adminDashView = document.getElementById('view-admin-dash');
    const carDetailsSection = document.getElementById('public-car-details-section');

    if (userDashView) userDashView.style.display = 'none';
    if (adminDashView) adminDashView.style.display = 'none';
    if (publicView) publicView.style.display = 'block';
    if (homeSection) homeSection.style.display = 'block';
    if (browseSection) browseSection.style.display = 'none';
    if (carDetailsSection) carDetailsSection.style.display = 'none';

    setTimeout(performScroll, 50);

    // Update active navbar link
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      const isTarget = href === `#${sectionId}` || 
        (sectionId === 'home-hero' && href === '#home') || 
        (sectionId === 'featured-fleet' && href === '#browse');
      link.classList.toggle('active', isTarget);
    });
  },

  async loadAllCars() {
    try {
      const cars = await CarsAPI.getAll();
      // Deduplicate unique vehicle records by ID
      const seenIds = new Set();
      this.allCars = (cars || []).filter(c => {
        if (!c || !c.id || seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });
      this.renderFleetGrid(this.allCars);
    } catch (err) {
      console.error('Error loading cars:', err);
    }
  },

  filterFleet(category, chipElement) {
    this.selectedCategory = category;
    
    // Update chip active classes
    document.querySelectorAll('.fleet-filter-chip').forEach(c => c.classList.remove('active'));
    if (chipElement) {
      chipElement.classList.add('active');
    } else {
      const defaultChip = document.querySelector(`.fleet-filter-chip[data-category="${category}"]`);
      if (defaultChip) defaultChip.classList.add('active');
    }

    let filtered = this.allCars;
    if (category && category !== 'All') {
      filtered = this.allCars.filter(c => c.type && c.type.toLowerCase() === category.toLowerCase());
    }
    this.renderFleetGrid(filtered);
  },

  renderFleetGrid(carsToRender) {
    const container = document.getElementById('featured-cars-grid');
    if (!container) return;

    // Strict deduplication by unique vehicle ID
    const seenIds = new Set();
    const uniqueCars = (carsToRender || []).filter(c => {
      if (!c || !c.id || seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    if (uniqueCars.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
          <h3>No cars found in this category</h3>
          <button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="Landing.filterFleet('All')">Show All Cars</button>
        </div>
      `;
      return;
    }

    const tagMap = {
      'car_bmw_5': { tag: 'Popular', badgeClass: 'badge-primary' },
      'car_range_rover_sport': { tag: 'Premium', badgeClass: 'badge-warning' },
      'car_audi_a6': { tag: 'Executive', badgeClass: 'badge-purple' },
      'car_merc_c': { tag: 'Best Value', badgeClass: 'badge-success' },
      'car_porsche_911': { tag: 'Supercar', badgeClass: 'badge-danger' },
      'car_merc_g63': { tag: 'AMG V8', badgeClass: 'badge-warning' },
      'car_toyota_fortuner': { tag: '4x4 SUV', badgeClass: 'badge-info' }
    };

    container.innerHTML = uniqueCars.map(car => {
      const tagInfo = tagMap[car.id] || { tag: car.type, badgeClass: 'badge-primary' };
      const isFav = Browse ? Browse.isCarFavourite(car.id) : false;
      const subCat = car.type === 'Sedan' ? (car.id === 'car_audi_a6' ? 'Executive Sedan' : 'Luxury Sedan') : (car.type === 'SUV' ? 'Luxury SUV' : (car.type === 'Sports' ? 'Super Sports' : car.type));

      return `
        <div class="fleet-card glass-card">
          <div class="fleet-card-img-wrap" onclick="Browse.openCarDetails('${car.id}')" style="cursor: pointer;">
            <img src="${car.image}" alt="${car.name}" class="fleet-card-img" loading="lazy" />
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); Browse.handleToggleFav('${car.id}', this)" title="Add to Favourites">
              ♥
            </button>
            <span class="fleet-tag-badge ${tagInfo.badgeClass}">
              ${tagInfo.tag}
            </span>
          </div>
          
          <div class="fleet-card-body">
            <div>
              <div class="fleet-card-title-row">
                <h3 onclick="Browse.openCarDetails('${car.id}')" style="cursor: pointer;">${car.name}</h3>
                <div class="fleet-rating">★ ${car.rating} <span style="color: var(--text-muted); font-size: 0.68rem;">(${car.reviewsCount || 80})</span></div>
              </div>
              <div class="fleet-sub-category">${subCat}</div>

              <div class="fleet-specs-pills">
                <span>👥 ${car.seats} Seats</span>
                <span>⚙ ${car.transmission}</span>
                <span>⛽ ${car.fuel}</span>
              </div>
            </div>

            <div class="fleet-price-row">
              <div>
                <span class="fleet-price-num">${formatCurrency(car.pricePerDay)}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">/ day</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="Browse.openCarDetails('${car.id}')" style="font-size: 0.8rem; padding: 6px 14px; font-weight: 700; border-radius: var(--radius-md);">
                View Details ➔
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  slideFleet(direction) {
    if (!this.allCars || this.allCars.length === 0) return;
    if (direction === 'next') {
      this.currentFleetIndex = (this.currentFleetIndex + 1) % this.allCars.length;
    } else {
      this.currentFleetIndex = (this.currentFleetIndex - 1 + this.allCars.length) % this.allCars.length;
    }

    const rotated = [];
    const count = Math.min(4, this.allCars.length);
    for (let i = 0; i < count; i++) {
      rotated.push(this.allCars[(this.currentFleetIndex + i) % this.allCars.length]);
    }
    this.renderFleetGrid(rotated);
  },

  renderTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    const reviews = [
      {
        name: 'Rahul Mehta',
        location: 'Mumbai',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
        text: 'Amazing experience! The car was in perfect condition and the booking process was super easy. Highly recommended!'
      },
      {
        name: 'Priya Sharma',
        location: 'Bangalore',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        text: 'Premium cars, great service and transparent pricing. DriveEase made our trip to Goa unforgettable!'
      },
      {
        name: 'Amit Verma',
        location: 'Delhi',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        text: 'Excellent fleet and professional support. The doorstep delivery was a game changer. Will definitely book again!'
      }
    ];

    container.innerHTML = reviews.map(r => `
      <div class="review-pill-card glass-card">
        <div>
          <div class="review-stars-row">★★★★★</div>
          <p class="review-quote-text">"${r.text}"</p>
        </div>
        <div class="review-driver-info">
          <img src="${r.avatar}" alt="${r.name}" class="driver-avatar-thumb" />
          <div class="driver-meta">
            <h4>${r.name}</h4>
            <span>${r.location}</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  renderFAQ() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    const faqs = [
      {
        q: 'What documents are required to rent a luxury car?',
        a: 'You only need a valid Driver\'s License (held for at least 1 year), a Government Photo ID (Aadhaar or Passport), and a credit/debit card or UPI for demo payment verification.'
      },
      {
        q: 'Can guest users browse cars and check availability without signing in?',
        a: 'Absolutely! Anyone can freely explore the complete fleet, filter by price and brand, check availability for specific dates, view detailed specifications, and calculate rental estimates without creating an account.'
      },
      {
        q: 'What is DriveEase\'s cancellation and refund policy?',
        a: 'We offer free 100% full refund cancellations up to 24 hours prior to the scheduled pickup time. Instant refunds are processed directly back to your original payment method.'
      },
      {
        q: 'Are all DriveEase rental vehicles fully insured?',
        a: 'Yes, every rental includes comprehensive zero-deductible insurance coverage, 24/7 roadside assistance, and towing support across all operational cities.'
      },
      {
        q: 'How does airport pickup and doorstep vehicle delivery work?',
        a: 'Select Airport or Doorstep Delivery during checkout. Our concierge will arrive with the fully sanitized car at your designated terminal or address, verify your license, and hand over the vehicle in under 2 minutes.'
      }
    ];

    container.innerHTML = faqs.map((f, i) => `
      <div class="faq-item ${i === 0 ? 'active' : ''}" onclick="this.classList.toggle('active')">
        <div class="faq-question">
          <span>${f.q}</span>
          <span class="faq-icon">▼</span>
        </div>
        <div class="faq-answer">
          ${f.a}
        </div>
      </div>
    `).join('');
  }
};
