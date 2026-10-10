// DriveEase - Premium Browse Fleet Page Controller, Filtering & Details
// Implements responsive 4/3/2/1 luxury automotive catalog, sticky filter sidebar,
// mobile filter drawer, date availability, comparison tray, and live specs calculator.

const Browse = {
  activeType: 'All',
  activeBrands: [],
  maxPrice: 40000,
  minRating: 0,
  transmission: 'All',
  fuel: 'All',
  seats: 'All',
  availabilityOnly: false,
  sort: 'recommended',
  searchQuery: '',
  pickupLocation: 'Mumbai Airport (BOM)',
  returnLocation: 'Same as Pickup',
  pickupDate: '',
  returnDate: '',
  userFavourites: [],
  allCars: [],
  searchDebounceTimer: null,
  sliderDebounceTimer: null,

  async init() {
    this.initDefaultDates();
    this.syncSearchContext();
    this.bindEvents();
    await this.loadUserFavourites();
    await this.loadCars();
    this.renderCompareTray();
  },

  // Set default dates: tomorrow and +3 days
  initDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnDay = new Date(today);
    returnDay.setDate(returnDay.getDate() + 4);

    const todayStr = toISODateString(today);
    const defPickup = toISODateString(tomorrow);
    const defReturn = toISODateString(returnDay);

    const pInput = document.getElementById('browse-pickup-date');
    const rInput = document.getElementById('browse-return-date');

    if (pInput) {
      pInput.min = todayStr;
      if (!pInput.value || !/^\d{4}-\d{2}-\d{2}$/.test(pInput.value)) {
        pInput.value = defPickup;
      }
      this.pickupDate = pInput.value;
    } else {
      this.pickupDate = defPickup;
    }

    if (rInput) {
      rInput.min = this.pickupDate || todayStr;
      if (!rInput.value || !/^\d{4}-\d{2}-\d{2}$/.test(rInput.value)) {
        rInput.value = defReturn;
      }
      this.returnDate = rInput.value;
    } else {
      this.returnDate = defReturn;
    }
  },

  // Sync with search context saved in session storage
  syncSearchContext() {
    try {
      const saved = sessionStorage.getItem('driveease_search_context');
      if (saved) {
        const ctx = JSON.parse(saved);
        if (ctx.pickupLoc) {
          this.pickupLocation = ctx.pickupLoc;
          const pLocEl = document.getElementById('browse-pickup-loc');
          if (pLocEl) pLocEl.value = ctx.pickupLoc;
        }
        if (ctx.returnLoc) {
          this.returnLocation = ctx.returnLoc;
          const rLocEl = document.getElementById('browse-return-loc');
          if (rLocEl) rLocEl.value = ctx.returnLoc;
        }
        if (ctx.pickupDate) {
          const validPickup = sanitizeISODate(ctx.pickupDate, new Date(Date.now() + 86400000));
          this.pickupDate = validPickup;
          const pDateEl = document.getElementById('browse-pickup-date');
          if (pDateEl) {
            pDateEl.value = validPickup;
            pDateEl.min = toISODateString(new Date());
          }
        }
        if (ctx.returnDate) {
          const validReturn = sanitizeISODate(ctx.returnDate, new Date(Date.now() + 86400000 * 4));
          this.returnDate = validReturn;
          const rDateEl = document.getElementById('browse-return-date');
          if (rDateEl) {
            rDateEl.value = validReturn;
            rDateEl.min = this.pickupDate || toISODateString(new Date());
          }
        }
        if (ctx.carType && ctx.carType !== 'All') {
          this.activeType = ctx.carType;
          document.querySelectorAll('#browse-type-chips .filter-chip').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-type') === ctx.carType);
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  },

  bindEvents() {
    // Top search bar date change auto-reflects
    const pDate = document.getElementById('browse-pickup-date');
    const rDate = document.getElementById('browse-return-date');
    if (pDate) {
      pDate.addEventListener('change', (e) => {
        const val = sanitizeISODate(e.target.value, new Date(Date.now() + 86400000));
        e.target.value = val;
        this.pickupDate = val;
        if (rDate) {
          rDate.min = val;
          if (rDate.value && rDate.value < val) {
            const nextDay = new Date(val);
            nextDay.setDate(nextDay.getDate() + 3);
            const newRet = toISODateString(nextDay);
            rDate.value = newRet;
            this.returnDate = newRet;
          }
        }
        this.loadCars();
      });
    }
    if (rDate) {
      rDate.addEventListener('change', (e) => {
        const val = sanitizeISODate(e.target.value, new Date(Date.now() + 86400000 * 4));
        e.target.value = val;
        this.returnDate = val;
        this.loadCars();
      });
    }
  },

  // Handle Top Search Submit
  handleTopSearchSubmit(e) {
    if (e) e.preventDefault();
    const pLoc = document.getElementById('browse-pickup-loc')?.value || 'Mumbai Airport (BOM)';
    const rLoc = document.getElementById('browse-return-loc')?.value || 'Same as Pickup';
    const rawPDate = document.getElementById('browse-pickup-date')?.value || '';
    const rawRDate = document.getElementById('browse-return-date')?.value || '';

    const pDate = rawPDate ? sanitizeISODate(rawPDate, new Date(Date.now() + 86400000)) : '';
    const rDate = rawRDate ? sanitizeISODate(rawRDate, new Date(Date.now() + 86400000 * 4)) : '';

    this.pickupLocation = pLoc;
    this.returnLocation = rLoc;
    this.pickupDate = pDate;
    this.returnDate = rDate;

    // Save to session
    sessionStorage.setItem('driveease_search_context', JSON.stringify({
      pickupLoc: pLoc,
      returnLoc: rLoc,
      pickupDate: pDate,
      returnDate: rDate,
      carType: this.activeType
    }));

    showToast('Availability Verified', `Showing fleet available in ${pLoc} for selected dates.`, 'info');
    this.loadCars();
  },

  // User Favourites Management
  async loadUserFavourites() {
    if (!State.token || !State.user) {
      this.userFavourites = [];
      return;
    }
    try {
      const favs = await FavouritesAPI.getAll();
      this.userFavourites = favs.map(f => f.id);
    } catch {
      this.userFavourites = [];
    }
  },

  isCarFavourite(carId) {
    return this.userFavourites.includes(carId);
  },

  async handleToggleFav(carId, btnElement) {
    if (!State.token || !State.user) {
      showToast('Login Required', 'Please log in to save cars to your favourites.', 'info');
      App.pendingAction = { type: 'favourite', carId };
      App.openAuthModal('signin');
      return;
    }

    try {
      const res = await FavouritesAPI.toggle(carId);
      if (res.isFavourite) {
        if (!this.userFavourites.includes(carId)) this.userFavourites.push(carId);
        if (btnElement) btnElement.classList.add('active');
        showToast('Saved to Favourites', 'Vehicle added to your personal collection.', 'success');
      } else {
        this.userFavourites = this.userFavourites.filter(id => id !== carId);
        if (btnElement) btnElement.classList.remove('active');
        showToast('Removed', 'Vehicle removed from your favourites.', 'info');
      }
      this.updateAllFavButtons(carId, res.isFavourite);
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  },

  updateAllFavButtons(carId, isFav) {
    document.querySelectorAll(`.fav-btn[data-car-id="${carId}"], .action-pill-btn[data-fav-id="${carId}"]`).forEach(b => {
      b.classList.toggle('active', isFav);
    });
  },

  // Filter Handlers
  handleSearchInput(val) {
    this.searchQuery = (val || '').trim();
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadCars();
    }, 250);
  },

  setTypeFilter(type, chipElement) {
    this.activeType = type;
    document.querySelectorAll('#browse-type-chips .filter-chip, #browse-mobile-drawer .filter-chip[data-type]').forEach(c => {
      c.classList.toggle('active', (c.getAttribute('data-type') || c.textContent.trim()) === type);
    });
    if (chipElement) chipElement.classList.add('active');
    this.loadCars();
  },

  setBrandFilter(brand, checkbox) {
    if (checkbox.checked) {
      if (!this.activeBrands.includes(brand)) this.activeBrands.push(brand);
    } else {
      this.activeBrands = this.activeBrands.filter(b => b !== brand);
    }
    this.loadCars();
  },

  handlePriceSlider(val) {
    this.maxPrice = Number(val);
    const text = `Up to ${formatCurrency(this.maxPrice)} / day`;
    
    const dDesk = document.getElementById('browse-price-display');
    const dMob = document.getElementById('browse-mobile-price-display');
    if (dDesk) dDesk.textContent = text;
    if (dMob) dMob.textContent = text;

    clearTimeout(this.sliderDebounceTimer);
    this.sliderDebounceTimer = setTimeout(() => {
      this.loadCars();
    }, 150);
  },

  setSeatFilter(seats, chipElement) {
    this.seats = seats;
    document.querySelectorAll('#browse-seat-chips .filter-chip').forEach(c => {
      c.classList.toggle('active', (c.getAttribute('data-seats') || c.textContent.trim()) === seats);
    });
    if (chipElement) chipElement.classList.add('active');
    this.loadCars();
  },

  setTransmission(val, chipElement) {
    this.transmission = val;
    document.querySelectorAll('#browse-trans-chips .filter-chip').forEach(c => {
      c.classList.toggle('active', (c.getAttribute('data-trans') || c.textContent.trim()) === val);
    });
    if (chipElement) chipElement.classList.add('active');
    this.loadCars();
  },

  setFuel(val, chipElement) {
    this.fuel = val;
    document.querySelectorAll('#browse-fuel-chips .filter-chip').forEach(c => {
      c.classList.toggle('active', (c.getAttribute('data-fuel') || c.textContent.trim()) === val);
    });
    if (chipElement) chipElement.classList.add('active');
    this.loadCars();
  },

  setMinRating(val, chipElement) {
    this.minRating = Number(val);
    document.querySelectorAll('#browse-rating-chips .filter-chip').forEach(c => {
      c.classList.toggle('active', Number(c.getAttribute('data-rating')) === this.minRating);
    });
    if (chipElement) chipElement.classList.add('active');
    this.loadCars();
  },

  setAvailabilityOnly(isOnly, chipElement) {
    this.availabilityOnly = Boolean(isOnly);
    document.querySelectorAll('#browse-avail-chips .filter-chip').forEach(c => {
      c.classList.toggle('active', (c.getAttribute('data-avail') === 'available') === this.availabilityOnly);
    });
    if (chipElement) chipElement.classList.add('active');
    this.loadCars();
  },

  setSort(val) {
    this.sort = val;
    this.loadCars();
  },

  resetFilters() {
    this.activeType = 'All';
    this.activeBrands = [];
    this.maxPrice = 40000;
    this.minRating = 0;
    this.transmission = 'All';
    this.fuel = 'All';
    this.seats = 'All';
    this.availabilityOnly = false;
    this.searchQuery = '';
    this.sort = 'recommended';

    // Reset inputs
    const sInput = document.getElementById('browse-filter-search');
    if (sInput) sInput.value = '';

    const pSlider = document.getElementById('browse-price-slider');
    if (pSlider) pSlider.value = 40000;
    const pDesk = document.getElementById('browse-price-display');
    if (pDesk) pDesk.textContent = 'Up to ₹40,000 / day';
    const pMob = document.getElementById('browse-mobile-price-display');
    if (pMob) pMob.textContent = 'Up to ₹40,000 / day';

    const sortSelect = document.getElementById('catalog-sort-select');
    if (sortSelect) sortSelect.value = 'recommended';

    // Reset Brand Checkboxes
    document.querySelectorAll('#browse-brand-checkboxes input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    // Reset All Chip Groups
    document.querySelectorAll('#browse-type-chips .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.querySelectorAll('#browse-seat-chips .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.querySelectorAll('#browse-trans-chips .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.querySelectorAll('#browse-fuel-chips .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.querySelectorAll('#browse-rating-chips .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    document.querySelectorAll('#browse-avail-chips .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));

    showToast('Filters Cleared', 'Showing all vehicles in our premium fleet.', 'info');
    this.loadCars();
  },

  toggleMobileFilter(isOpen) {
    const drawer = document.getElementById('browse-mobile-drawer');
    if (!drawer) return;
    if (isOpen) {
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Comparison Tray & Modal Logic
  toggleCompare(carId) {
    if (!State.compareList) State.compareList = [];
    const idx = State.compareList.indexOf(carId);

    if (idx > -1) {
      State.compareList.splice(idx, 1);
      showToast('Comparison Updated', 'Vehicle removed from comparison tray.', 'info');
    } else {
      if (State.compareList.length >= 3) {
        showToast('Limit Reached', 'You can compare up to 3 vehicles side by side.', 'warning');
        return;
      }
      State.compareList.push(carId);
      showToast('Added to Compare', 'Vehicle added to comparison tray.', 'success');
    }

    localStorage.setItem('driveease_compare', JSON.stringify(State.compareList));
    this.renderCompareTray();
    this.updateCompareButtons(carId);
  },

  updateCompareButtons(carId) {
    const isCompared = State.compareList.includes(carId);
    document.querySelectorAll(`.compare-btn[data-car-id="${carId}"], .action-pill-btn[data-compare-id="${carId}"]`).forEach(btn => {
      btn.classList.toggle('active', isCompared);
      if (btn.classList.contains('action-pill-btn')) {
        btn.style.color = isCompared ? 'var(--cyan)' : 'var(--text-secondary)';
        btn.style.borderColor = isCompared ? 'var(--cyan)' : 'rgba(255,255,255,0.15)';
      }
    });
  },

  renderCompareTray() {
    const tray = document.getElementById('compare-tray');
    const wrap = document.getElementById('compare-chips-wrap');
    if (!tray || !wrap) return;

    if (!State.compareList || State.compareList.length === 0) {
      tray.classList.remove('active');
      return;
    }

    tray.classList.add('active');

    // Render chips
    wrap.innerHTML = State.compareList.map(id => {
      const car = this.allCars.find(c => c.id === id) || { name: 'Vehicle', image: '' };
      return `
        <div class="compare-chip" style="display: flex; align-items: center; gap: 6px; background: rgba(37, 99, 235, 0.15); border: 1px solid var(--primary); padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.75rem; color: #fff;">
          <img src="${car.image}" style="width: 20px; height: 14px; object-fit: cover; border-radius: 2px;" />
          <strong>${car.name}</strong>
          <span style="cursor: pointer; color: var(--rose); margin-left: 4px; font-weight: 800;" onclick="Browse.toggleCompare('${id}')" title="Remove">✕</span>
        </div>
      `;
    }).join('');
  },

  async openCompareModal() {
    if (!State.compareList || State.compareList.length === 0) {
      showToast('Compare Empty', 'Please select at least 2 vehicles to compare.', 'info');
      return;
    }

    try {
      const cars = await Promise.all(State.compareList.map(id => CarsAPI.getById(id)));
      const content = document.getElementById('compare-modal-content');
      if (!content) return;

      content.innerHTML = `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th style="padding: 14px; width: 160px; color: var(--text-muted);">SPECIFICATION</th>
                ${cars.map(c => `
                  <th style="padding: 14px; min-width: 200px;">
                    <div style="position: relative; height: 120px; border-radius: var(--radius-md); overflow: hidden; margin-bottom: 8px;">
                      <img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                    <strong style="font-size: 1rem; color: var(--text-primary);">${c.name}</strong>
                    <div style="color: var(--cyan); font-weight: 800; font-size: 0.95rem; margin-top: 2px;">${formatCurrency(c.pricePerDay)}/day</div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Brand</td>
                ${cars.map(c => `<td style="padding: 12px;">${c.brand}</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Category</td>
                ${cars.map(c => `<td style="padding: 12px;"><span class="badge badge-primary">${c.type}</span></td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Rating</td>
                ${cars.map(c => `<td style="padding: 12px; color: var(--amber); font-weight: 700;">★ ${c.rating} (${c.reviewsCount || 80})</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Engine Power</td>
                ${cars.map(c => `<td style="padding: 12px; color: var(--cyan); font-weight: 700;">${c.power || '250 HP'}</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">0-100 km/h</td>
                ${cars.map(c => `<td style="padding: 12px; color: var(--emerald); font-weight: 700;">${c.acceleration || '6.5s'}</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Seating Capacity</td>
                ${cars.map(c => `<td style="padding: 12px;">👥 ${c.seats} Persons</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Transmission</td>
                ${cars.map(c => `<td style="padding: 12px;">⚙ ${c.transmission}</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Fuel & Mileage</td>
                ${cars.map(c => `<td style="padding: 12px;">⛽ ${c.fuel} (${c.mileage || '14 km/l'})</td>`).join('')}
              </tr>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px; font-weight: 700; color: var(--text-secondary);">Top Speed</td>
                ${cars.map(c => `<td style="padding: 12px;">🏁 ${c.topSpeed || '250 km/h'}</td>`).join('')}
              </tr>
              <tr>
                <td style="padding: 16px 12px; font-weight: 700; color: var(--text-secondary);">Action</td>
                ${cars.map(c => `
                  <td style="padding: 16px 12px;">
                    <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="closeModal('compare-modal'); Booking.startBooking('${c.id}')">
                      Book ${c.name.split(' ')[0]} ➔
                    </button>
                  </td>
                `).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;

      openModal('compare-modal');
    } catch (err) {
      showToast('Error', 'Failed to load comparison: ' + err.message, 'error');
    }
  },

  // Main Fleet Loader & Responsive Card Engine
  async loadCars() {
    const grid = document.getElementById('catalog-cars-grid');
    const counter = document.getElementById('catalog-results-count');
    if (!grid) return;

    // Show Skeleton Cards
    grid.innerHTML = Array(6).fill(0).map(() => `
      <div class="catalog-car-card" style="padding: 0; min-height: 380px;">
        <div class="skeleton" style="height: 165px; width: 100%; border-radius: 0;"></div>
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div class="skeleton" style="height: 20px; width: 70%;"></div>
          <div class="skeleton" style="height: 14px; width: 40%;"></div>
          <div class="skeleton" style="height: 14px; width: 90%;"></div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px;">
            <div class="skeleton" style="height: 24px; width: 40%;"></div>
            <div class="skeleton" style="height: 32px; width: 45%;"></div>
          </div>
        </div>
      </div>
    `).join('');

    try {
      const params = {};
      if (this.searchQuery) params.search = this.searchQuery;
      if (this.activeType && this.activeType !== 'All') params.type = this.activeType;
      if (this.activeBrands.length > 0) params.brand = this.activeBrands.join(',');
      if (this.maxPrice) params.maxPrice = this.maxPrice;
      if (this.transmission && this.transmission !== 'All') params.transmission = this.transmission;
      if (this.fuel && this.fuel !== 'All') params.fuel = this.fuel;
      if (this.minRating > 0) params.minRating = this.minRating;
      if (this.seats && this.seats !== 'All') params.seats = this.seats;
      if (this.sort) params.sort = this.sort;
      if (this.pickupDate && this.returnDate) {
        params.pickupDate = this.pickupDate;
        params.returnDate = this.returnDate;
      }

      const rawCars = await CarsAPI.getAll(params);
      const seenIds = new Set();
      const cars = (rawCars || []).filter(c => {
        if (!c || !c.id || seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });
      this.allCars = cars;

      // Filter availability only if requested
      let displayCars = cars;
      if (this.availabilityOnly) {
        displayCars = displayCars.filter(c => c.isAvailableForDates !== false && c.status === 'Available');
      }

      // Update counter
      if (counter) {
        counter.textContent = `${displayCars.length} Cars Available`;
      }

      // Empty State
      if (displayCars.length === 0) {
        grid.innerHTML = `
          <div class="browse-empty-state">
            <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 15px rgba(37,99,235,0.4));">🚗</div>
            <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">No vehicles match your search.</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 8px auto 24px;">
              Try changing your dates, location or adjusting your filters to discover other exceptional vehicles in our fleet.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="Browse.resetFilters()">
                ↺ Clear Filters
              </button>
              <button class="btn btn-outline" onclick="Browse.resetFilters(); document.getElementById('browse-pickup-date').value=''; document.getElementById('browse-return-date').value=''; Browse.loadCars();">
                Browse All Cars ➔
              </button>
            </div>
          </div>
        `;
        return;
      }

      // Render Vehicle Cards
      grid.innerHTML = displayCars.map(car => {
        const isFav = this.isCarFavourite(car.id);
        const isCompared = State.compareList ? State.compareList.includes(car.id) : false;
        const isAvailable = car.isAvailableForDates !== false && car.status === 'Available';
        const subCat = car.type === 'Sedan' ? (car.id === 'car_audi_a6' ? 'Executive Sedan' : 'Luxury Sedan') : (car.type === 'SUV' ? 'Luxury SUV' : (car.type === 'Sports' ? 'Super Sports' : car.type));

        return `
          <div class="catalog-car-card" id="car-card-${car.id}">
            
            <!-- Top Image & Quick Badges -->
            <div class="catalog-car-img-wrap" onclick="Browse.openCarDetails('${car.id}')">
              <img src="${car.image}" alt="${car.name}" class="catalog-car-img" loading="lazy" />
              
              <!-- Badges -->
              <div class="catalog-card-badges">
                <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}" style="font-size: 0.68rem;">
                  <span class="badge-dot"></span>
                  ${isAvailable ? 'Available' : 'Unavailable'}
                </span>
                <span class="badge badge-primary" style="font-size: 0.68rem;">
                  ${car.type}
                </span>
              </div>

              <!-- Top Actions: Favourite & Compare -->
              <div class="catalog-card-actions-top" onclick="event.stopPropagation();">
                <button class="action-pill-btn fav-btn ${isFav ? 'active' : ''}" data-fav-id="${car.id}" onclick="Browse.handleToggleFav('${car.id}', this)" title="Save to Favourites">
                  ♥
                </button>
                <button class="action-pill-btn compare-btn ${isCompared ? 'active' : ''}" data-compare-id="${car.id}" style="${isCompared ? 'color: var(--cyan); border-color: var(--cyan);' : ''}" onclick="Browse.toggleCompare('${car.id}')" title="Compare Side-by-Side">
                  ⚖
                </button>
              </div>
            </div>

            <!-- Card Body -->
            <div class="catalog-car-body">
              <div>
                <!-- Title Row -->
                <div class="catalog-car-title-row">
                  <h3 onclick="Browse.openCarDetails('${car.id}')">${car.name}</h3>
                  <div class="catalog-car-rating">
                    <span>★</span>
                    <span>${car.rating}</span>
                    <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 500;">(${car.reviewsCount || 85})</span>
                  </div>
                </div>

                <!-- Subtitle Category & Location -->
                <div class="catalog-car-sub">
                  <span>${subCat}</span> • <span>${car.brand}</span>
                </div>

                <!-- Specs Row -->
                <div class="catalog-car-specs">
                  <span>👥 ${car.seats} Seats</span>
                  <span>⚙ ${car.transmission}</span>
                  <span>⛽ ${car.fuel}</span>
                </div>
              </div>

              <!-- Pricing & Action Buttons -->
              <div>
                <div class="catalog-car-footer">
                  <div>
                    <span class="catalog-price-num">${formatCurrency(car.pricePerDay)}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">/ day</span>
                  </div>

                  <div class="catalog-car-btns">
                    <button class="btn btn-secondary btn-sm" onclick="Browse.openCarDetails('${car.id}')" style="padding: 6px 10px; font-size: 0.78rem;">
                      Details
                    </button>
                    <button class="btn btn-primary btn-sm" ${!isAvailable ? 'disabled style="opacity: 0.45; cursor: not-allowed;" title="Unavailable for selected dates"' : ''} onclick="Booking.startBooking('${car.id}')" style="padding: 6px 12px; font-size: 0.78rem; font-weight: 700;">
                      ${isAvailable ? 'Book Now' : 'Unavailable'}
                    </button>
                  </div>
                </div>

                ${!isAvailable ? `
                  <div style="font-size: 0.68rem; color: var(--rose); margin-top: 6px; text-align: right; font-weight: 600;">
                    Unavailable for selected dates
                  </div>
                ` : ''}
              </div>

            </div>

          </div>
        `;
      }).join('');

    } catch (err) {
      grid.innerHTML = `
        <div class="browse-empty-state">
          <h3 style="color: var(--rose);">Error loading fleet</h3>
          <p style="color: var(--text-secondary); margin-top: 6px;">${err.message}</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 14px;" onclick="Browse.loadCars()">Try Again</button>
        </div>
      `;
    }
  },

  // Open Car Details (Navigates to Dedicated Car Details Page)
  openCarDetails(carId) {
    App.navigateTo(`#car/${carId}`);
  }
};

// Aliases for Landing Page compatibility with Comparison & Details
if (typeof Landing !== 'undefined') {
  Landing.toggleCompare = (id) => Browse.toggleCompare(id);
  Landing.openCompareModal = () => Browse.openCompareModal();
  Landing.renderCompareTray = () => Browse.renderCompareTray();
}
