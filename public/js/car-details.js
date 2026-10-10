// DriveEase - Dedicated Car Details Controller
// Implements full 9-section vehicle detail experience, interactive gallery,
// quick specs, live price calculator, date availability, reviews, and similar cars.

const CarDetails = {
  currentCar: null,
  allCars: [],
  currentImageIndex: 0,
  galleryImages: [],
  pickupLocation: 'Mumbai Airport (BOM)',
  returnLocation: 'Same as Pickup',
  pickupDate: '',
  returnDate: '',
  isDescriptionExpanded: false,

  async init(carId) {
    if (!carId) {
      // Default to first car or read from hash
      const hash = window.location.hash || '';
      const match = hash.match(/#(?:car|car-details)\/([a-zA-Z0-9_-]+)/);
      carId = match ? match[1] : 'car_bmw_5';
    }

    this.initDefaultDates();
    this.renderSkeleton();

    try {
      const [car, allCars] = await Promise.all([
        CarsAPI.getById(carId),
        CarsAPI.getAll()
      ]);

      if (!car) {
        this.renderNotFound();
        return;
      }

      this.currentCar = car;
      this.allCars = allCars;
      this.galleryImages = car.gallery && car.gallery.length > 0 ? car.gallery : [car.image];
      this.currentImageIndex = 0;
      this.isDescriptionExpanded = false;

      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      this.renderNotFound(err.message);
    }
  },

  initDefaultDates() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const retDay = new Date();
    retDay.setDate(retDay.getDate() + 4);

    // Read from search context if available
    try {
      const saved = sessionStorage.getItem('driveease_search_context');
      if (saved) {
        const ctx = JSON.parse(saved);
        if (ctx.pickupDate) this.pickupDate = sanitizeISODate(ctx.pickupDate, tomorrow);
        if (ctx.returnDate) this.returnDate = sanitizeISODate(ctx.returnDate, retDay);
        if (ctx.pickupLoc) this.pickupLocation = ctx.pickupLoc;
        if (ctx.returnLoc) this.returnLocation = ctx.returnLoc;
      }
    } catch {
      // Ignore
    }

    if (!this.pickupDate) {
      this.pickupDate = toISODateString(tomorrow);
    }
    if (!this.returnDate) {
      this.returnDate = toISODateString(retDay);
    }
  },

  renderSkeleton() {
    const container = document.getElementById('public-car-details-section');
    if (!container) return;

    container.innerHTML = `
      <div class="details-page-wrap">
        <div class="skeleton" style="height: 20px; width: 240px; margin-bottom: 24px;"></div>
        
        <div class="details-hero-layout">
          <div class="skeleton" style="height: 440px; border-radius: var(--radius-xl);"></div>
          <div class="skeleton" style="height: 440px; border-radius: var(--radius-xl);"></div>
        </div>

        <div class="details-content-grid">
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="skeleton" style="height: 160px; border-radius: var(--radius-xl);"></div>
            <div class="skeleton" style="height: 200px; border-radius: var(--radius-xl);"></div>
            <div class="skeleton" style="height: 180px; border-radius: var(--radius-xl);"></div>
          </div>
          <div class="skeleton" style="height: 480px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;
  },

  renderNotFound(errorMsg) {
    const container = document.getElementById('public-car-details-section');
    if (!container) return;

    container.innerHTML = `
      <div class="details-page-wrap">
        <div class="details-error-state">
          <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 15px rgba(244,63,94,0.4));">🚫</div>
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">Vehicle Not Found</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 24px;">
            ${errorMsg || "The vehicle you're looking for is unavailable or may have been removed from our active fleet."}
          </p>
          <button class="btn btn-primary btn-lg" onclick="App.navigateTo('#browse')">
            ← Back to Browse Fleet
          </button>
        </div>
      </div>
    `;
  },

  // Gallery Controls
  changeMainImage(index) {
    if (index < 0 || index >= this.galleryImages.length) return;
    this.currentImageIndex = index;
    const mainImg = document.getElementById('car-detail-main-img');
    if (mainImg) {
      mainImg.src = this.galleryImages[index];
    }
    document.querySelectorAll('.details-thumb-item').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  },

  prevImage() {
    const newIdx = (this.currentImageIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
    this.changeMainImage(newIdx);
  },

  nextImage() {
    const newIdx = (this.currentImageIndex + 1) % this.galleryImages.length;
    this.changeMainImage(newIdx);
  },

  // Description Read More / Read Less Toggle
  toggleDescription() {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
    const textEl = document.getElementById('car-desc-content');
    const btnEl = document.getElementById('car-desc-toggle-btn');
    if (textEl && btnEl) {
      if (this.isDescriptionExpanded) {
        textEl.classList.remove('details-desc-collapsed');
        btnEl.innerHTML = `Read Less ▴`;
      } else {
        textEl.classList.add('details-desc-collapsed');
        btnEl.innerHTML = `Read More ▾`;
      }
    }
  },

  // Check Availability for Given Dates
  isCarAvailableForDates(startStr, endStr) {
    if (!this.currentCar) return false;
    if (this.currentCar.status !== 'Available') return false;
    if (!startStr || !endStr) return true;

    const reqStart = new Date(startStr).getTime();
    const reqEnd = new Date(endStr).getTime();
    if (reqEnd < reqStart) return false;

    const activeBookings = this.currentCar.activeBookings || [];
    const isBooked = activeBookings.some(b => {
      const bStart = new Date(b.pickupDate).getTime();
      const bEnd = new Date(b.returnDate).getTime();
      return (reqStart <= bEnd && reqEnd >= bStart);
    });

    return !isBooked;
  },

  // Live Pricing Calculation
  updatePricingCalculator() {
    const pDateInput = document.getElementById('details-booking-pickup');
    const rDateInput = document.getElementById('details-booking-return');
    const pLocInput = document.getElementById('details-booking-pickup-loc');
    const rLocInput = document.getElementById('details-booking-return-loc');

    if (pDateInput) this.pickupDate = pDateInput.value;
    if (rDateInput) this.returnDate = rDateInput.value;
    if (pLocInput) this.pickupLocation = pLocInput.value;
    if (rLocInput) this.returnLocation = rLocInput.value;

    const s = new Date(this.pickupDate);
    const e = new Date(this.returnDate);

    let days = 1;
    if (s && e && e >= s) {
      days = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
    }

    const pricePerDay = this.currentCar ? this.currentCar.pricePerDay : 0;
    const baseRental = pricePerDay * days;
    const insurance = Math.round(baseRental * 0.10);
    const taxes = Math.round((baseRental + insurance) * 0.18);
    const total = baseRental + insurance + taxes;

    // Check Availability
    const isAvailable = this.isCarAvailableForDates(this.pickupDate, this.returnDate);

    // Update UI elements
    const daysLabel = document.getElementById('details-calc-days');
    const baseLabel = document.getElementById('details-calc-base');
    const insLabel = document.getElementById('details-calc-ins');
    const taxLabel = document.getElementById('details-calc-tax');
    const totalLabel = document.getElementById('details-calc-total');
    const availBadge = document.getElementById('details-calc-avail-badge');
    const bookBtn = document.getElementById('details-calc-book-btn');
    const heroBookBtn = document.getElementById('details-hero-book-btn');

    if (daysLabel) daysLabel.textContent = `₹${formatNumber(pricePerDay)} × ${days} ${days === 1 ? 'day' : 'days'}`;
    if (baseLabel) baseLabel.textContent = formatCurrency(baseRental);
    if (insLabel) insLabel.textContent = formatCurrency(insurance);
    if (taxLabel) taxLabel.textContent = formatCurrency(taxes);
    if (totalLabel) totalLabel.textContent = formatCurrency(total);

    if (availBadge) {
      if (isAvailable) {
        availBadge.className = 'badge badge-success';
        availBadge.innerHTML = `<span class="badge-dot"></span> Available for Selected Dates`;
      } else {
        availBadge.className = 'badge badge-danger';
        availBadge.innerHTML = `<span class="badge-dot"></span> Unavailable for Selected Dates`;
      }
    }

    if (bookBtn) {
      bookBtn.disabled = !isAvailable;
      bookBtn.style.opacity = isAvailable ? '1' : '0.45';
      bookBtn.style.cursor = isAvailable ? 'pointer' : 'not-allowed';
      bookBtn.textContent = isAvailable ? 'Book Now ➔' : 'Unavailable for Dates';
    }

    if (heroBookBtn) {
      heroBookBtn.disabled = !isAvailable;
      heroBookBtn.style.opacity = isAvailable ? '1' : '0.45';
      heroBookBtn.style.cursor = isAvailable ? 'pointer' : 'not-allowed';
      heroBookBtn.textContent = isAvailable ? 'Book Now ➔' : 'Unavailable';
    }

    // Save context
    sessionStorage.setItem('driveease_search_context', JSON.stringify({
      pickupLoc: this.pickupLocation,
      returnLoc: this.returnLocation,
      pickupDate: this.pickupDate,
      returnDate: this.returnDate,
      carType: this.currentCar ? this.currentCar.type : 'All'
    }));
  },

  // Hand off to existing Booking Wizard
  startBooking() {
    if (!this.currentCar) return;
    if (!this.isCarAvailableForDates(this.pickupDate, this.returnDate)) {
      showToast('Unavailable', 'This vehicle is unavailable for the selected dates. Please select alternative dates.', 'warning');
      return;
    }

    // Pass chosen context
    sessionStorage.setItem('driveease_search_context', JSON.stringify({
      pickupLoc: this.pickupLocation,
      returnLoc: this.returnLocation,
      pickupDate: this.pickupDate,
      returnDate: this.returnDate,
      carType: this.currentCar.type
    }));

    Booking.startBooking(this.currentCar.id);
  },

  // Toggle Favourite
  async toggleFavourite(carId, btnEl) {
    if (typeof Browse !== 'undefined') {
      await Browse.handleToggleFav(carId, btnEl);
      const isFav = Browse.isCarFavourite(carId);
      this.updateFavButtons(isFav);
    }
  },

  updateFavButtons(isFav) {
    const btn = document.getElementById('details-hero-fav-btn');
    if (btn) {
      btn.classList.toggle('active', isFav);
      btn.innerHTML = isFav ? `♥ Saved` : `♡ Favourite`;
    }
  },

  // Toggle Comparison
  toggleCompare(carId) {
    if (typeof Browse !== 'undefined') {
      Browse.toggleCompare(carId);
      const isCompared = State.compareList ? State.compareList.includes(carId) : false;
      this.updateCompareButtons(isCompared);
    }
  },

  updateCompareButtons(isCompared) {
    const btn = document.getElementById('details-hero-compare-btn');
    if (btn) {
      btn.classList.toggle('active', isCompared);
      btn.innerHTML = isCompared ? `✓ Added to Compare` : `⚖ Compare`;
      btn.style.color = isCompared ? 'var(--cyan)' : '';
      btn.style.borderColor = isCompared ? 'var(--cyan)' : '';
    }
  },

  // Main Render Method
  render() {
    const container = document.getElementById('public-car-details-section');
    if (!container || !this.currentCar) return;

    const car = this.currentCar;
    const isFav = typeof Browse !== 'undefined' ? Browse.isCarFavourite(car.id) : false;
    const isCompared = State.compareList ? State.compareList.includes(car.id) : false;
    const categoryBadge = car.type === 'Sedan' ? (car.id === 'car_audi_a6' ? 'EXECUTIVE SEDAN' : 'LUXURY SEDAN') : (car.type === 'SUV' ? 'LUXURY SUV' : (car.type === 'Sports' ? 'SUPER SPORTS' : car.type.toUpperCase()));

    // Deduplicate reviews by ID or unique composite key
    const rawReviews = Array.isArray(car.reviews) ? car.reviews : [];
    const seenReviewKeys = new Set();
    const reviews = rawReviews.filter(r => {
      const key = r.id || `${r.userId || ''}_${r.createdAt || ''}_${(r.comment || '').trim()}`;
      if (seenReviewKeys.has(key)) return false;
      seenReviewKeys.add(key);
      return true;
    });

    const totalRevCount = reviews.length;
    const avgRating = totalRevCount > 0
      ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / totalRevCount).toFixed(1)
      : (car.rating || 5.0);

    const count5 = reviews.filter(r => Math.round(Number(r.rating)) === 5).length;
    const count4 = reviews.filter(r => Math.round(Number(r.rating)) === 4).length;
    const count3 = reviews.filter(r => Math.round(Number(r.rating)) === 3).length;
    const count2 = reviews.filter(r => Math.round(Number(r.rating)) === 2).length;
    const count1 = reviews.filter(r => Math.round(Number(r.rating)) === 1).length;

    const pct5 = totalRevCount > 0 ? Math.round((count5 / totalRevCount) * 100) : 100;
    const pct4 = totalRevCount > 0 ? Math.round((count4 / totalRevCount) * 100) : 0;
    const pct3 = totalRevCount > 0 ? Math.round((count3 / totalRevCount) * 100) : 0;
    const pct2 = totalRevCount > 0 ? Math.round((count2 / totalRevCount) * 100) : 0;
    const pct1 = totalRevCount > 0 ? Math.round((count1 / totalRevCount) * 100) : 0;

    // Filter Similar Cars (3-4 similar cars: same category or closest price)
    const similarCars = this.allCars
      .filter(c => c.id !== car.id)
      .sort((a, b) => {
        if (a.type === car.type && b.type !== car.type) return -1;
        if (b.type === car.type && a.type !== car.type) return 1;
        return Math.abs(a.pricePerDay - car.pricePerDay) - Math.abs(b.pricePerDay - car.pricePerDay);
      })
      .slice(0, 4);

    container.innerHTML = `
      <div class="details-page-wrap">
        
        <!-- 1. BREADCRUMB TRAIL -->
        <nav class="details-breadcrumb">
          <a href="#home" onclick="App.navigateTo('#home')">Home</a>
          <span class="details-breadcrumb-sep">/</span>
          <a href="#browse" onclick="App.navigateTo('#browse')">Browse Cars</a>
          <span class="details-breadcrumb-sep">/</span>
          <span class="details-breadcrumb-current">${car.name}</span>
        </nav>

        <!-- 2. VEHICLE HERO (Two Columns: Gallery on Left, Summary on Right) -->
        <section class="details-hero-layout">
          
          <!-- Left: Gallery -->
          <div class="details-gallery-card">
            <div class="details-main-img-wrap">
              <img id="car-detail-main-img" src="${this.galleryImages[0]}" alt="${car.name}" class="details-main-img" />
              
              ${this.galleryImages.length > 1 ? `
                <button class="details-gallery-arrow prev" onclick="CarDetails.prevImage()" title="Previous Image">‹</button>
                <button class="details-gallery-arrow next" onclick="CarDetails.nextImage()" title="Next Image">›</button>
              ` : ''}

              <div style="position: absolute; top: 16px; left: 16px; z-index: 2;">
                <span class="badge ${car.status === 'Available' ? 'badge-success' : 'badge-danger'}">
                  <span class="badge-dot"></span> ${car.status || 'Available'}
                </span>
              </div>
            </div>

            <!-- Thumbnail Strip -->
            <div class="details-thumb-strip">
              ${this.galleryImages.map((img, idx) => `
                <div class="details-thumb-item ${idx === 0 ? 'active' : ''}" onclick="CarDetails.changeMainImage(${idx})">
                  <img src="${img}" alt="${car.name} thumbnail ${idx + 1}" loading="lazy" />
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right: Summary & Quick CTAs -->
          <div class="details-summary-card glass-card">
            <div>
              <div class="details-badge-row">
                <span class="badge badge-primary" style="font-size: 0.75rem; letter-spacing: 0.6px;">${categoryBadge}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">📍 ${car.location ? car.location.split('&')[0].trim() : 'Mumbai Airport (BOM)'}</span>
              </div>

              <h1 class="details-car-title">${car.name}</h1>

              <div class="details-rating-row">
                <div class="details-rating-stars">
                  <span>★</span>
                  <span>${avgRating}</span>
                </div>
                <span class="details-rating-count">(${totalRevCount} Verified Reviews)</span>
              </div>

              <div class="details-price-tag-row">
                <span class="details-price-main">${formatCurrency(car.pricePerDay)}</span>
                <span class="details-price-sub">/ day (24-hour rental)</span>
              </div>

              <!-- Quick Info Chips -->
              <div class="details-quick-specs-pills" style="margin-top: 14px;">
                <span class="details-quick-pill">👥 ${car.seats} Seats</span>
                <span class="details-quick-pill">⚙ ${car.transmission}</span>
                <span class="details-quick-pill">⛽ ${car.fuel}</span>
                ${car.power ? `<span class="details-quick-pill">⚡ ${car.power}</span>` : ''}
              </div>
            </div>

            <!-- Primary Action Buttons -->
            <div class="details-hero-ctas">
              <button id="details-hero-book-btn" class="btn btn-primary btn-book-primary" onclick="CarDetails.startBooking()">
                Book Now ➔
              </button>
              <button id="details-hero-fav-btn" class="btn btn-secondary btn-action-icon ${isFav ? 'active' : ''}" onclick="CarDetails.toggleFavourite('${car.id}', this)">
                ${isFav ? '♥ Saved' : '♡ Favourite'}
              </button>
              <button id="details-hero-compare-btn" class="btn btn-outline btn-action-icon ${isCompared ? 'active' : ''}" onclick="CarDetails.toggleCompare('${car.id}')" style="${isCompared ? 'color: var(--cyan); border-color: var(--cyan);' : ''}">
                ${isCompared ? '✓ Added to Compare' : '⚖ Compare'}
              </button>
            </div>
          </div>

        </section>

        <!-- TWO-COLUMN CONTENT GRID (Left: Specs, Features, Desc, Policies, Reviews; Right: Sticky Booking Widget) -->
        <div class="details-content-grid">
          
          <!-- LEFT COLUMN: Detailed Specifications & Content -->
          <div class="details-left-sections">
            
            <!-- 3. QUICK SPECIFICATIONS MATRIX -->
            <section class="details-section-card glass-card">
              <div class="details-section-title-row">
                <span>⚡</span>
                <h2>Performance & Specifications</h2>
              </div>

              <div class="details-specs-matrix">
                ${car.power ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Engine Power</span>
                    <span class="details-spec-val" style="color: var(--cyan);">${car.power}</span>
                  </div>
                ` : ''}
                ${car.acceleration ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">0–100 km/h</span>
                    <span class="details-spec-val" style="color: var(--emerald);">${car.acceleration}</span>
                  </div>
                ` : ''}
                ${car.topSpeed ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Top Speed</span>
                    <span class="details-spec-val" style="color: var(--amber);">${car.topSpeed}</span>
                  </div>
                ` : ''}
                ${car.seats ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Seating Capacity</span>
                    <span class="details-spec-val" style="color: var(--purple);">${car.seats} Persons</span>
                  </div>
                ` : ''}
                ${car.transmission ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Transmission</span>
                    <span class="details-spec-val">${car.transmission}</span>
                  </div>
                ` : ''}
                ${car.fuel ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Fuel Type</span>
                    <span class="details-spec-val">${car.fuel}</span>
                  </div>
                ` : ''}
                ${car.mileage ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Fuel Mileage</span>
                    <span class="details-spec-val">${car.mileage}</span>
                  </div>
                ` : ''}
                ${car.year ? `
                  <div class="details-spec-box">
                    <span class="details-spec-lbl">Model Year</span>
                    <span class="details-spec-val">${car.year}</span>
                  </div>
                ` : ''}
              </div>
            </section>

            <!-- 5. VEHICLE FEATURES CHECKLIST -->
            <section class="details-section-card glass-card">
              <div class="details-section-title-row">
                <span>⭐</span>
                <h2>Premium Luxury Features</h2>
              </div>

              <div class="details-features-grid">
                ${(car.features && car.features.length > 0 ? car.features : ['Apple CarPlay & Android Auto', 'Panoramic Glass Sunroof', 'Harman Kardon Surround Sound', 'Adaptive Cruise Control', '360° Parking Camera', 'Ventilated Leather Seats', 'Wireless Phone Charging', 'Ambient Interior Lighting']).map(f => `
                  <div class="details-feature-item">
                    <span class="details-feature-icon">✓</span>
                    <span>${f}</span>
                  </div>
                `).join('')}
              </div>
            </section>

            <!-- 6. VEHICLE DESCRIPTION -->
            <section class="details-section-card glass-card">
              <div class="details-section-title-row">
                <span>📖</span>
                <h2>About This Vehicle</h2>
              </div>

              <div id="car-desc-content" class="details-desc-body details-desc-collapsed">
                <p>
                  ${car.description || 'Experience the highest standard of automotive engineering and luxury. Designed for effortless journeys, uncompromising safety, and superior executive comfort.'}
                </p>
                <p style="margin-top: 10px;">
                  All DriveEase rental vehicles undergo rigorous multi-point mechanical inspections, comprehensive sanitization, and are equipped with factory-original luxury amenities for a peerless driving experience.
                </p>
              </div>
              <button id="car-desc-toggle-btn" class="btn-read-more" onclick="CarDetails.toggleDescription()">
                Read More ▾
              </button>
            </section>

            <!-- 7. RENTAL POLICIES & INFORMATION -->
            <section class="details-section-card glass-card">
              <div class="details-section-title-row">
                <span>🛡️</span>
                <h2>Rental & Booking Policies</h2>
              </div>

              <div class="details-policy-grid">
                <div class="details-policy-card">
                  <span class="details-policy-title">🛡️ Cancellation Policy</span>
                  <span class="details-policy-text">${car.cancellationPolicy || 'Free cancellation up to 24 hours prior to journey. 100% instant refund guaranteed.'}</span>
                </div>
                <div class="details-policy-card">
                  <span class="details-policy-title">💳 Security Deposit</span>
                  <span class="details-policy-text">₹0 Zero-Deposit with VIP coverage option. Pre-authorization only on standard bookings.</span>
                </div>
                <div class="details-policy-card">
                  <span class="details-policy-title">🛣️ Mileage Freedom</span>
                  <span class="details-policy-text">Unlimited kilometers included on 3+ day rentals. Standard 300 km/day on daily bookings.</span>
                </div>
                <div class="details-policy-card">
                  <span class="details-policy-title">⛽ Fuel Policy</span>
                  <span class="details-policy-text">Full-to-Full. Vehicle delivered with a 100% full tank and returned in the same state.</span>
                </div>
              </div>
            </section>

            <!-- 8. CUSTOMER REVIEWS -->
            <section class="details-section-card glass-card">
              <div class="details-section-title-row">
                <span>💬</span>
                <h2>Customer Reviews (${totalRevCount})</h2>
              </div>

              ${totalRevCount > 0 ? `
                <!-- Rating Score & Distribution -->
                <div class="details-reviews-summary-row">
                  <div class="details-score-box">
                    <div class="details-score-num">${avgRating}</div>
                    <div style="color: var(--amber); font-size: 0.95rem; margin: 4px 0;">${'★'.repeat(Math.max(1, Math.min(5, Math.round(Number(avgRating)))))}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${totalRevCount} verified ${totalRevCount === 1 ? 'rating' : 'ratings'}</div>
                  </div>

                  <div class="details-dist-bars">
                    <div class="details-dist-row">
                      <span>5 ★</span>
                      <div class="details-dist-progress"><div class="details-dist-fill" style="width: ${pct5}%;"></div></div>
                      <span>${pct5}%</span>
                    </div>
                    <div class="details-dist-row">
                      <span>4 ★</span>
                      <div class="details-dist-progress"><div class="details-dist-fill" style="width: ${pct4}%;"></div></div>
                      <span>${pct4}%</span>
                    </div>
                    <div class="details-dist-row">
                      <span>3 ★</span>
                      <div class="details-dist-progress"><div class="details-dist-fill" style="width: ${pct3}%;"></div></div>
                      <span>${pct3}%</span>
                    </div>
                    <div class="details-dist-row">
                      <span>2 ★</span>
                      <div class="details-dist-progress"><div class="details-dist-fill" style="width: ${pct2}%;"></div></div>
                      <span>${pct2}%</span>
                    </div>
                    <div class="details-dist-row">
                      <span>1 ★</span>
                      <div class="details-dist-progress"><div class="details-dist-fill" style="width: ${pct1}%;"></div></div>
                      <span>${pct1}%</span>
                    </div>
                  </div>
                </div>

                <!-- Review Cards List -->
                <div class="details-review-list">
                  ${reviews.map(r => `
                    <div class="details-review-card">
                      <div class="details-review-head">
                        <div class="details-reviewer-info">
                          <img src="${r.userAvatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(r.userName || 'Customer')}" alt="${r.userName || 'Customer'}" class="details-reviewer-avatar" />
                          <div>
                            <strong style="font-size: 0.88rem; color: var(--text-primary);">${r.userName || 'Verified Driver'}</strong>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified Rental'}</div>
                          </div>
                        </div>
                        <div style="color: var(--amber); font-size: 0.85rem; font-weight: 700;">${'★'.repeat(Math.max(1, Math.min(5, Math.round(r.rating || 5))))}</div>
                      </div>
                      ${r.title ? `<div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${r.title}</div>` : ''}
                      <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">${r.comment}</p>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="details-no-reviews-state" style="text-align: center; padding: 36px 20px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: var(--radius-lg); margin-top: 16px;">
                  <div style="font-size: 2rem; margin-bottom: 8px;">✨</div>
                  <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No Customer Reviews Yet</h4>
                  <p style="font-size: 0.82rem; color: var(--text-muted); max-width: 420px; margin: 0 auto;">
                    This vehicle is pristine in our fleet. Be the first to experience and review this car after your rental journey!
                  </p>
                </div>
              `}
            </section>

          </div>

          <!-- RIGHT COLUMN: 4. STICKY BOOKING & AVAILABILITY / LIVE PRICE ESTIMATOR WIDGET -->
          <div class="details-sticky-booking-card glass-panel">
            
            <div class="details-booking-head">
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0 0 2px;">Reserve This Vehicle</h3>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Instant booking confirmation</span>
              </div>
              <div id="details-calc-avail-badge" class="badge badge-success">
                <span class="badge-dot"></span> Available
              </div>
            </div>

            <div class="details-booking-inputs-grid">
              
              <!-- Pickup Location -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.72rem;">PICKUP LOCATION</label>
                <select id="details-booking-pickup-loc" class="form-control" style="font-size: 0.82rem; padding: 8px;" onchange="CarDetails.updatePricingCalculator()">
                  <option value="Mumbai Airport (BOM)" ${this.pickupLocation.includes('Mumbai Airport') ? 'selected' : ''}>Mumbai Airport (BOM)</option>
                  <option value="Mumbai Downtown Hub" ${this.pickupLocation.includes('Downtown') ? 'selected' : ''}>Mumbai Downtown Hub</option>
                  <option value="Delhi NCR Terminal 3" ${this.pickupLocation.includes('Delhi') ? 'selected' : ''}>Delhi NCR Terminal 3</option>
                  <option value="Bangalore Tech Corridor" ${this.pickupLocation.includes('Bangalore') ? 'selected' : ''}>Bangalore Tech Corridor</option>
                  <option value="Goa Airport (GOI)" ${this.pickupLocation.includes('Goa') ? 'selected' : ''}>Goa Airport (GOI)</option>
                  <option value="Pune City Center" ${this.pickupLocation.includes('Pune') ? 'selected' : ''}>Pune City Center</option>
                </select>
              </div>

              <!-- Return Location -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.72rem;">RETURN LOCATION</label>
                <select id="details-booking-return-loc" class="form-control" style="font-size: 0.82rem; padding: 8px;" onchange="CarDetails.updatePricingCalculator()">
                  <option value="Same as Pickup">Same as Pickup</option>
                  <option value="Mumbai Airport (BOM)">Mumbai Airport (BOM)</option>
                  <option value="Mumbai Downtown Hub">Mumbai Downtown Hub</option>
                  <option value="Delhi NCR Terminal 3">Delhi NCR Terminal 3</option>
                  <option value="Bangalore Tech Corridor">Bangalore Tech Corridor</option>
                  <option value="Goa Airport (GOI)">Goa Airport (GOI)</option>
                </select>
              </div>

              <!-- Pickup & Return Dates -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.72rem;">PICKUP DATE</label>
                  <input type="date" id="details-booking-pickup" class="form-control" style="font-size: 0.82rem; padding: 8px;" min="${toISODateString(new Date())}" value="${this.pickupDate}" onchange="CarDetails.updatePricingCalculator()" />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-size: 0.72rem;">RETURN DATE</label>
                  <input type="date" id="details-booking-return" class="form-control" style="font-size: 0.82rem; padding: 8px;" min="${this.pickupDate || toISODateString(new Date())}" value="${this.returnDate}" onchange="CarDetails.updatePricingCalculator()" />
                </div>
              </div>

            </div>

            <!-- 5. PRICE BREAKDOWN BOX -->
            <div class="details-price-breakdown-box">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--cyan); letter-spacing: 0.6px; text-transform: uppercase;">
                Estimated Price Summary
              </div>
              
              <div class="details-breakdown-row">
                <span id="details-calc-days">Base Rental (3 days)</span>
                <span id="details-calc-base">${formatCurrency(car.pricePerDay * 3)}</span>
              </div>
              <div class="details-breakdown-row">
                <span>Zero-Deductible Insurance (10%)</span>
                <span id="details-calc-ins">${formatCurrency(car.pricePerDay * 3 * 0.1)}</span>
              </div>
              <div class="details-breakdown-row">
                <span>Taxes & GST (18%)</span>
                <span id="details-calc-tax">${formatCurrency(car.pricePerDay * 3 * 1.1 * 0.18)}</span>
              </div>
              
              <div class="details-breakdown-total">
                <span>Estimated Total:</span>
                <span id="details-calc-total" class="total-cyan">${formatCurrency(Math.round(car.pricePerDay * 3 * 1.1 * 1.18))}</span>
              </div>
            </div>

            <!-- Booking Submit CTA -->
            <button id="details-calc-book-btn" class="btn btn-primary btn-lg" onclick="CarDetails.startBooking()" style="width: 100%; font-weight: 800;">
              Book Now ➔
            </button>

            <!-- Trust Badges Note -->
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 14px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: var(--emerald);">✓</span>
                <span>Free cancellation up to 24h prior</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: var(--emerald);">✓</span>
                <span>Zero hidden fees & transparent billing</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: var(--emerald);">✓</span>
                <span>24/7 VIP roadside concierge support</span>
              </div>
            </div>

          </div>

        </div>

        <!-- 9. SIMILAR / RECOMMENDED CARS ("You May Also Like") -->
        <section class="details-similar-section">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span class="tag">SIMILAR FLEET</span>
              <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-top: 4px;">You May Also Like</h2>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('#browse')">
              Browse All Fleet ➔
            </button>
          </div>

          <div class="details-similar-grid">
            ${similarCars.map(sc => {
              const scFav = typeof Browse !== 'undefined' ? Browse.isCarFavourite(sc.id) : false;
              return `
                <div class="catalog-car-card">
                  <div class="catalog-car-img-wrap" onclick="App.navigateTo('#car/${sc.id}')">
                    <img src="${sc.image}" alt="${sc.name}" class="catalog-car-img" loading="lazy" />
                    <div class="catalog-card-badges">
                      <span class="badge badge-primary" style="font-size: 0.68rem;">${sc.type}</span>
                    </div>
                  </div>
                  <div class="catalog-car-body">
                    <div>
                      <div class="catalog-car-title-row">
                        <h3 onclick="App.navigateTo('#car/${sc.id}')">${sc.name}</h3>
                        <div class="catalog-car-rating">★ ${sc.rating}</div>
                      </div>
                      <div class="catalog-car-sub">${sc.brand} • ${sc.seats} Seats</div>
                      <div class="catalog-car-specs">
                        <span>⚙ ${sc.transmission}</span>
                        <span>⛽ ${sc.fuel}</span>
                      </div>
                    </div>
                    <div class="catalog-car-footer">
                      <div>
                        <span class="catalog-price-num">${formatCurrency(sc.pricePerDay)}</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">/ d</span>
                      </div>
                      <div class="catalog-car-btns">
                        <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('#car/${sc.id}')" style="padding: 6px 10px; font-size: 0.78rem;">
                          Details
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="Booking.startBooking('${sc.id}')" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700;">
                          Book
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

      </div>
    `;

    // Trigger initial calculation
    this.updatePricingCalculator();
  }
};
