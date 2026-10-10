// DriveEase - Multi-Step Booking Wizard, Live Pricing, Coupons & Demo Payment

const Booking = {
  currentStep: 1,
  selectedCar: null,
  pickupDate: '',
  returnDate: '',
  pickupTime: '10:00 AM',
  returnTime: '06:00 PM',
  pickupLocation: 'Mumbai Airport (BOM)',
  returnLocation: 'Mumbai Airport (BOM)',
  days: 3,
  selectedAddOns: ['addon_ins'],
  appliedCoupon: null,
  discountAmount: 0,
  selectedPaymentMethod: 'Credit Card',
  createdBooking: null,
  isSubmitting: false,

  // Driver information state
  driverName: '',
  driverEmail: '',
  driverPhone: '',
  driverLicense: '',

  availableAddOns: [
    { id: 'addon_ins', name: 'Comprehensive Zero-Deductible Insurance', desc: '100% bumper-to-bumper damage & theft waiver', price: 0, required: true },
    { id: 'addon_gps', name: 'High-Precision GPS Navigation', desc: 'Pre-loaded offline satellite maps & traffic rerouting', price: 600 },
    { id: 'addon_seat', name: 'Premium ISOFIX Child Safety Seat', desc: 'Comfortable age-appropriate child restraint seat', price: 800 },
    { id: 'addon_driver', name: 'Additional Driver Authorization', desc: 'Legally authorizes a second verified co-driver', price: 1000 },
    { id: 'addon_airport', name: 'Airport VIP Meet & Greet Concierge', desc: 'Direct terminal curbside handover with luggage assistance', price: 1500 },
    { id: 'addon_mileage', name: 'Unlimited Mileage Freedom Pack', desc: 'Drive unlimited kilometers without excess distance surcharge', price: 2000 }
  ],

  async startBooking(carId) {
    if (!State.token || !State.user) {
      showToast('Login Required', 'Please log in to book a car.', 'info'); // Please log in to continue with your booking.
      App.pendingAction = { type: 'booking', carId };
      App.openAuthModal('signin');
      return;
    }

    try {
      this.selectedCar = await CarsAPI.getById(carId);
      if (!this.selectedCar) {
        showToast('Error', 'Vehicle not found or currently unavailable.', 'error');
        return;
      }

      this.currentStep = 1;
      this.appliedCoupon = null;
      this.discountAmount = 0;
      this.isSubmitting = false;
      this.selectedAddOns = ['addon_ins']; // Comprehensive insurance selected by default

      // Pre-fill driver information from authenticated user
      this.driverName = State.user.name || '';
      this.driverEmail = State.user.email || '';
      this.driverPhone = State.user.phone || '+91 98234 56789';
      this.driverLicense = State.user.licenseNumber || 'MH-01-2022-0048192';

      // Prepopulate dates from search context or default
      let searchCtx = {};
      try {
        searchCtx = JSON.parse(sessionStorage.getItem('driveease_search_context') || '{}');
      } catch {
        searchCtx = {};
      }

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const retDay = new Date(today);
      retDay.setDate(retDay.getDate() + 4);
      const fmt = d => d.toISOString().split('T')[0];

      this.pickupDate = searchCtx.pickupDate || fmt(tomorrow);
      this.returnDate = searchCtx.returnDate || fmt(retDay);
      this.pickupLocation = searchCtx.pickupLoc || 'Mumbai Airport (BOM)';
      this.returnLocation = searchCtx.returnLoc && searchCtx.returnLoc !== 'Same as Pickup' ? searchCtx.returnLoc : this.pickupLocation;

      this.renderWizard();
      openModal('booking-wizard-modal');
    } catch (err) {
      showToast('Error', 'Unable to initialize booking: ' + err.message, 'error');
    }
  },

  isCarAvailableForDates(startStr, endStr) {
    if (!this.selectedCar) return false;
    if (this.selectedCar.status !== 'Available') return false;
    if (!startStr || !endStr) return true;

    const reqStart = new Date(startStr).getTime();
    const reqEnd = new Date(endStr).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd < reqStart) return false;

    const activeBookings = this.selectedCar.activeBookings || [];
    const isBooked = activeBookings.some(b => {
      const bStart = new Date(b.pickupDate).getTime();
      const bEnd = new Date(b.returnDate).getTime();
      return (reqStart <= bEnd && reqEnd >= bStart);
    });

    return !isBooked;
  },

  calculateDays() {
    const s = new Date(this.pickupDate);
    const e = new Date(this.returnDate);
    if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  },

  calculatePricing() {
    this.days = this.calculateDays();
    const pricePerDay = this.selectedCar ? this.selectedCar.pricePerDay : 0;
    const basePrice = pricePerDay * this.days;
    const insurancePrice = Math.round(basePrice * 0.10);

    let addOnsTotal = 0;
    this.selectedAddOns.forEach(addonId => {
      const addon = this.availableAddOns.find(a => a.id === addonId);
      if (addon) {
        if (addon.id === 'addon_ins') {
          addOnsTotal += insurancePrice;
        } else {
          addOnsTotal += addon.price;
        }
      }
    });

    const subtotal = basePrice + addOnsTotal;
    const discount = Math.min(this.discountAmount || 0, subtotal);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = Math.round(discountedSubtotal * 0.18);
    const totalAmount = discountedSubtotal + tax;

    return {
      days: this.days,
      basePrice,
      insurancePrice,
      addOnsTotal,
      subtotal,
      discount,
      tax,
      totalAmount
    };
  },

  renderWizard() {
    const container = document.getElementById('booking-wizard-content');
    if (!container || !this.selectedCar) return;

    const pricing = this.calculatePricing();
    const isAvailable = this.isCarAvailableForDates(this.pickupDate, this.returnDate);

    container.innerHTML = `
      <!-- Step Indicator Bar -->
      <div class="wizard-steps-header">
        <div class="step-indicator ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}">
          <div class="step-circle">${this.currentStep > 1 ? '✓' : '1'}</div>
          <span class="step-label">Schedule</span>
        </div>
        <div class="step-connector ${this.currentStep > 1 ? 'active' : ''}"></div>
        <div class="step-indicator ${this.currentStep >= 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}">
          <div class="step-circle">${this.currentStep > 2 ? '✓' : '2'}</div>
          <span class="step-label">Add-ons</span>
        </div>
        <div class="step-connector ${this.currentStep > 2 ? 'active' : ''}"></div>
        <div class="step-indicator ${this.currentStep >= 3 ? 'active' : ''} ${this.currentStep > 3 ? 'completed' : ''}">
          <div class="step-circle">${this.currentStep > 3 ? '✓' : '3'}</div>
          <span class="step-label">Driver</span>
        </div>
        <div class="step-connector ${this.currentStep > 3 ? 'active' : ''}"></div>
        <div class="step-indicator ${this.currentStep >= 4 ? 'active' : ''} ${this.currentStep > 4 ? 'completed' : ''}">
          <div class="step-circle">${this.currentStep > 4 ? '✓' : '4'}</div>
          <span class="step-label">Payment</span>
        </div>
      </div>

      <div class="modal-body wizard-modal-body">
        <div class="wizard-grid-layout">
          
          <!-- Left: Current Wizard Step Pane -->
          <div class="wizard-step-content-area">
            ${this.renderStepPane(pricing, isAvailable)}
          </div>

          <!-- Right: Sticky Live Price Summary -->
          <div class="wizard-summary-area">
            <div class="order-summary-box">
              <div class="summary-car-card">
                <img src="${this.selectedCar.image}" alt="${this.selectedCar.name}" class="summary-car-thumb" />
                <div>
                  <span class="badge badge-primary">${this.selectedCar.brand}</span>
                  <h4 style="font-size: 0.95rem; margin-top: 4px; font-weight: 700;">${this.selectedCar.name}</h4>
                  <div style="font-size: 0.78rem; color: var(--text-secondary);">${this.selectedCar.type} • ${this.selectedCar.transmission}</div>
                </div>
              </div>

              <div class="summary-line-item">
                <span>Duration:</span>
                <strong>${pricing.days} ${pricing.days === 1 ? 'Day' : 'Days'}</strong>
              </div>
              <div class="summary-line-item">
                <span>Base Rental Rate:</span>
                <span>${formatCurrency(pricing.basePrice)}</span>
              </div>
              <div class="summary-line-item">
                <span>Protection & Add-ons:</span>
                <span>${formatCurrency(pricing.addOnsTotal)}</span>
              </div>

              ${pricing.discount > 0 ? `
                <div class="summary-line-item discount-line">
                  <span>Promo (${this.appliedCoupon}):</span>
                  <span>-${formatCurrency(pricing.discount)}</span>
                </div>
              ` : ''}

              <div class="summary-line-item">
                <span>GST / Taxes (18%):</span>
                <span>${formatCurrency(pricing.tax)}</span>
              </div>

              <div class="summary-total-line">
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Final Payable</div>
                  <div class="summary-total-num">${formatCurrency(pricing.totalAmount)}</div>
                </div>
                <div style="text-align: right;">
                  <span class="badge badge-success">✓ Zero Security Deposit</span>
                </div>
              </div>

              <!-- Coupon Code Box (Available in Steps 2, 3, 4) -->
              ${this.currentStep >= 2 ? `
                <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 14px;">
                  <label class="form-label" style="font-size: 0.75rem;">PROMO / DISCOUNT CODE</label>
                  <div class="coupon-input-group">
                    <input type="text" id="wizard-coupon-input" class="form-control" placeholder="e.g. WEEKEND20" value="${this.appliedCoupon || ''}" style="text-transform: uppercase; font-weight: 700; font-size: 0.85rem;" />
                    <button class="btn btn-secondary btn-sm" onclick="Booking.applyCoupon()">Apply</button>
                  </div>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                    <span class="badge badge-info" style="cursor: pointer;" onclick="Booking.quickApplyCoupon('WEEKEND20')">WEEKEND20</span>
                    <span class="badge badge-info" style="cursor: pointer;" onclick="Booking.quickApplyCoupon('FIRST20')">FIRST20</span>
                    <span class="badge badge-info" style="cursor: pointer;" onclick="Booking.quickApplyCoupon('DRIVE10')">DRIVE10</span>
                  </div>
                  ${this.appliedCoupon ? `
                    <div class="coupon-applied-badge">
                      <span>✓ ${this.appliedCoupon} Applied (-${formatCurrency(pricing.discount)})</span>
                      <span style="cursor: pointer; padding: 2px 6px; font-weight: 800;" onclick="Booking.removeCoupon()" title="Remove Coupon">✕</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer Wizard Navigation -->
      <div class="modal-footer wizard-modal-footer">
        ${this.currentStep > 1 ? `
          <button class="btn btn-secondary" onclick="Booking.prevStep()" ${this.isSubmitting ? 'disabled' : ''}>← Previous</button>
        ` : '<div></div>'}
        
        ${this.currentStep < 4 ? `
          <button class="btn btn-primary" onclick="Booking.nextStep()" ${(!isAvailable && this.currentStep === 1) ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            Continue ➔
          </button>
        ` : `
          <button id="wizard-pay-submit-btn" class="btn btn-primary btn-lg" onclick="Booking.processDemoPayment()" ${this.isSubmitting ? 'disabled' : ''} style="font-weight: 800;">
            ${this.isSubmitting 
              ? (this.selectedPaymentMethod === 'Pay at Pickup' ? '🚗 Confirming Reservation...' : '🔒 Processing Demo Payment...') 
              : (this.selectedPaymentMethod === 'Pay at Pickup' ? `🚗 Confirm Reservation (Pay ${formatCurrency(pricing.totalAmount)} at Pickup)` : `🔒 Pay ${formatCurrency(pricing.totalAmount)} & Confirm (Demo)`)}
          </button>
        `}
      </div>
    `;
  },

  renderStepPane(pricing, isAvailable) {
    const todayStr = new Date().toISOString().split('T')[0];

    if (this.currentStep === 1) {
      return `
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0;">1. Rental Schedule & Locations</h3>
            <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">
              <span class="badge-dot"></span> ${isAvailable ? 'Available for Dates' : 'Unavailable for Dates'}
            </span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 20px;">
            Choose your pickup and drop-off dates, times, and delivery hubs.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">PICKUP DATE *</label>
              <input type="date" id="step-pickup-date" class="form-control" min="${todayStr}" value="${this.pickupDate}" onchange="Booking.handlePickupDateChange(this.value)" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">RETURN DATE *</label>
              <input type="date" id="step-return-date" class="form-control" min="${this.pickupDate || todayStr}" value="${this.returnDate}" onchange="Booking.handleReturnDateChange(this.value)" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">PICKUP TIME</label>
              <select id="step-pickup-time" class="form-control" onchange="Booking.pickupTime = this.value;">
                <option ${this.pickupTime === '08:00 AM' ? 'selected' : ''}>08:00 AM</option>
                <option ${this.pickupTime === '10:00 AM' ? 'selected' : ''}>10:00 AM</option>
                <option ${this.pickupTime === '12:00 PM' ? 'selected' : ''}>12:00 PM</option>
                <option ${this.pickupTime === '03:00 PM' ? 'selected' : ''}>03:00 PM</option>
                <option ${this.pickupTime === '06:00 PM' ? 'selected' : ''}>06:00 PM</option>
                <option ${this.pickupTime === '09:00 PM' ? 'selected' : ''}>09:00 PM</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">RETURN TIME</label>
              <select id="step-return-time" class="form-control" onchange="Booking.returnTime = this.value;">
                <option ${this.returnTime === '08:00 AM' ? 'selected' : ''}>08:00 AM</option>
                <option ${this.returnTime === '10:00 AM' ? 'selected' : ''}>10:00 AM</option>
                <option ${this.returnTime === '12:00 PM' ? 'selected' : ''}>12:00 PM</option>
                <option ${this.returnTime === '03:00 PM' ? 'selected' : ''}>03:00 PM</option>
                <option ${this.returnTime === '06:00 PM' ? 'selected' : ''}>06:00 PM</option>
                <option ${this.returnTime === '09:00 PM' ? 'selected' : ''}>09:00 PM</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.75rem;">PICKUP LOCATION *</label>
            <select id="step-pickup-loc" class="form-control" onchange="Booking.pickupLocation = this.value;">
              <option value="Mumbai Airport (BOM)" ${this.pickupLocation.includes('Mumbai Airport') ? 'selected' : ''}>Mumbai Airport (BOM) Terminal 1 & 2</option>
              <option value="Bandra Downtown Hub, Mumbai" ${this.pickupLocation.includes('Bandra') ? 'selected' : ''}>Bandra Downtown Hub, Mumbai</option>
              <option value="Indiranagar Hub, Bangalore" ${this.pickupLocation.includes('Indiranagar') ? 'selected' : ''}>Indiranagar Hub, Bangalore</option>
              <option value="Bangalore Airport (BLR)" ${this.pickupLocation.includes('Bangalore Airport') ? 'selected' : ''}>Bangalore Airport (BLR)</option>
              <option value="Connaught Place, New Delhi" ${this.pickupLocation.includes('Connaught') ? 'selected' : ''}>Connaught Place, New Delhi</option>
              <option value="Delhi Airport (DEL) T3" ${this.pickupLocation.includes('Delhi Airport') ? 'selected' : ''}>Delhi Airport (DEL) T3 VIP</option>
              <option value="Doorstep VIP Delivery" ${this.pickupLocation.includes('Doorstep') ? 'selected' : ''}>Doorstep VIP Delivery (Hotel / Residence)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.75rem;">RETURN LOCATION *</label>
            <select id="step-return-loc" class="form-control" onchange="Booking.returnLocation = this.value;">
              <option value="${this.pickupLocation}" ${this.returnLocation === this.pickupLocation ? 'selected' : ''}>Same as Pickup Location</option>
              <option value="Mumbai Airport (BOM)" ${this.returnLocation === 'Mumbai Airport (BOM)' ? 'selected' : ''}>Mumbai Airport (BOM) Terminal 1 & 2</option>
              <option value="Bangalore Airport (BLR)" ${this.returnLocation === 'Bangalore Airport (BLR)' ? 'selected' : ''}>Bangalore Airport (BLR)</option>
              <option value="Delhi Airport (DEL) T3" ${this.returnLocation === 'Delhi Airport (DEL) T3' ? 'selected' : ''}>Delhi Airport (DEL) T3 VIP</option>
              <option value="Doorstep VIP Collection" ${this.returnLocation.includes('Doorstep') ? 'selected' : ''}>Doorstep VIP Collection</option>
            </select>
          </div>

          ${!isAvailable ? `
            <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); padding: 12px; border-radius: var(--radius-md); font-size: 0.8rem; color: var(--rose); margin-top: 10px;">
              ⚠️ <strong>Date Conflict:</strong> This vehicle is already reserved for the selected dates. Please adjust your dates to continue.
            </div>
          ` : ''}
        </div>
      `;
    }

    if (this.currentStep === 2) {
      return `
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px;">2. Premium Add-ons & Protection</h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px;">
            Enhance your journey with tailor-made luxury concierge options.
          </p>

          <div class="addons-selection-grid">
            ${this.availableAddOns.map(addon => {
              const isSelected = this.selectedAddOns.includes(addon.id);
              const priceDisplay = addon.id === 'addon_ins' ? formatCurrency(pricing.insurancePrice) : formatCurrency(addon.price);

              return `
                <div class="addon-card ${isSelected ? 'selected' : ''}" onclick="Booking.toggleAddon('${addon.id}')">
                  <input type="checkbox" class="addon-checkbox" ${isSelected ? 'checked' : ''} ${addon.required ? 'disabled' : ''} />
                  <div class="addon-details">
                    <h4>${addon.name} ${addon.required ? '<span style="font-size: 0.65rem; color: var(--cyan); font-weight: normal;">(Included)</span>' : ''}</h4>
                    <p>${addon.desc}</p>
                    <div class="addon-price-tag">+ ${priceDisplay}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (this.currentStep === 3) {
      return `
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px;">3. Verified Driver Information</h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 16px;">
            Please verify primary driver contact details and driver license.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">PRIMARY DRIVER NAME *</label>
              <input type="text" id="driver-name" class="form-control" value="${this.driverName}" oninput="Booking.driverName = this.value" placeholder="e.g. John Doe" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">EMAIL ADDRESS *</label>
              <input type="email" id="driver-email" class="form-control" value="${this.driverEmail}" readonly style="opacity: 0.85; cursor: not-allowed;" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">PHONE NUMBER *</label>
              <input type="tel" id="driver-phone" class="form-control" value="${this.driverPhone}" oninput="Booking.driverPhone = this.value" placeholder="+91 98765 43210" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">DRIVER'S LICENSE NUMBER *</label>
              <input type="text" id="driver-license" class="form-control" placeholder="e.g. MH-01-2018-0094821" value="${this.driverLicense}" oninput="Booking.driverLicense = this.value" />
            </div>
          </div>

          <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.2); padding: 14px; border-radius: var(--radius-md); font-size: 0.8rem; color: var(--cyan); margin-top: 8px;">
            🛡️ <strong>Instant Verification:</strong> Your driving profile is pre-verified under VIP Express Handover. No physical paperwork needed at pickup.
          </div>
        </div>
      `;
    }

    if (this.currentStep === 4) {
      return `
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0;">4. Payment Method & Confirmation</h3>
            <span class="badge badge-info">
              <span class="badge-dot"></span> Demo Environment
            </span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px;">
            Select your preferred payment method. Choose instant demo digital checkout or Pay at Pickup.
          </p>

          <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.2); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.78rem; color: var(--cyan); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>🛡️</span>
            <span><strong>DEMO PAYMENT ENVIRONMENT:</strong> Simulated transaction gateway. No real bank accounts or cards will be charged.</span>
          </div>

          <!-- Payment Tabs (6 Options) -->
          <div class="payment-tabs-header">
            <div class="payment-tab-btn ${this.selectedPaymentMethod === 'Credit Card' ? 'active' : ''}" onclick="Booking.selectedPaymentMethod = 'Credit Card'; Booking.renderWizard();">
              <span style="font-size: 1.1rem;">💳</span>
              <span>Credit Card</span>
            </div>
            <div class="payment-tab-btn ${this.selectedPaymentMethod === 'Debit Card' ? 'active' : ''}" onclick="Booking.selectedPaymentMethod = 'Debit Card'; Booking.renderWizard();">
              <span style="font-size: 1.1rem;">💳</span>
              <span>Debit Card</span>
            </div>
            <div class="payment-tab-btn ${this.selectedPaymentMethod === 'UPI' ? 'active' : ''}" onclick="Booking.selectedPaymentMethod = 'UPI'; Booking.renderWizard();">
              <span style="font-size: 1.1rem;">📱</span>
              <span>UPI / QR</span>
            </div>
            <div class="payment-tab-btn ${this.selectedPaymentMethod === 'Net Banking' ? 'active' : ''}" onclick="Booking.selectedPaymentMethod = 'Net Banking'; Booking.renderWizard();">
              <span style="font-size: 1.1rem;">🏦</span>
              <span>Net Banking</span>
            </div>
            <div class="payment-tab-btn ${this.selectedPaymentMethod === 'Wallet' ? 'active' : ''}" onclick="Booking.selectedPaymentMethod = 'Wallet'; Booking.renderWizard();">
              <span style="font-size: 1.1rem;">👛</span>
              <span>VIP Wallet</span>
            </div>
            <div class="payment-tab-btn ${this.selectedPaymentMethod === 'Pay at Pickup' ? 'active' : ''}" onclick="Booking.selectedPaymentMethod = 'Pay at Pickup'; Booking.renderWizard();">
              <span style="font-size: 1.1rem;">🚗</span>
              <span>Pay at Pickup</span>
            </div>
          </div>

          <!-- Method Specific Forms -->
          ${this.selectedPaymentMethod === 'Credit Card' ? `
            <!-- Live 3D Visual Card -->
            <div class="card-visual-preview">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="card-preview-chip"></div>
                <div style="font-weight: 800; font-size: 1.1rem; letter-spacing: 1px; color: #38bdf8;">VISA PLATINUM</div>
              </div>
              <div class="card-preview-number" id="preview-card-num">•••• •••• •••• 4242</div>
              <div class="card-preview-bottom">
                <div>
                  <div style="font-size: 0.65rem; color: #94a3b8;">CARD HOLDER</div>
                  <div class="card-preview-holder" id="preview-card-name">${this.driverName.toUpperCase() || 'JOHN DOE'}</div>
                </div>
                <div>
                  <div style="font-size: 0.65rem; color: #94a3b8;">EXPIRES</div>
                  <div id="preview-card-exp">12/28</div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 0.75rem;">CREDIT CARD NUMBER</label>
              <input type="text" id="pay-card-number" class="form-control" value="4242 •••• •••• 4242" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">EXPIRY DATE</label>
                <input type="text" class="form-control" value="12/28" />
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">CVV / CVC</label>
                <input type="password" class="form-control" value="888" maxlength="4" />
              </div>
            </div>
          ` : ''}

          ${this.selectedPaymentMethod === 'Debit Card' ? `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">All Indian Debit Cards Accepted</span>
                <div style="display: flex; gap: 6px;">
                  <span class="badge badge-info" style="font-size: 0.7rem;">RuPay</span>
                  <span class="badge badge-primary" style="font-size: 0.7rem;">Visa Debit</span>
                  <span class="badge badge-warning" style="font-size: 0.7rem;">Mastercard</span>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">CARDHOLDER NAME</label>
                <input type="text" class="form-control" value="${this.driverName || 'John Doe'}" />
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">DEBIT CARD NUMBER</label>
                <input type="text" id="pay-debit-number" class="form-control" value="6071 •••• •••• 8821" />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">EXPIRY DATE</label>
                  <input type="text" class="form-control" value="09/27" />
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size: 0.75rem;">CVV</label>
                  <input type="password" class="form-control" value="321" maxlength="3" />
                </div>
              </div>
            </div>
          ` : ''}

          ${this.selectedPaymentMethod === 'UPI' ? `
            <div class="upi-panel-box">
              <div class="upi-qr-card">
                <svg width="140" height="140" viewBox="0 0 100 100" fill="#0f172a">
                  <path d="M0 0h30v30H0zm5 5v20h20V5zm35-5h30v30H40zm5 5v20h20V5zM0 40h30v30H0zm5 5v20h20V45zm35 0h10v10H40zm10 10h10v10H50zm10-10h10v10H60zm-20 20h10v10H40zm20 0h10v10H60zm10-20h10v10H70zm0 20h10v10H70zM0 70h30v30H0zm5 5v20h20V75zm35 5h10v10H40zm10 10h10v10H50zm10-10h10v10H60zm10 10h10v10H70z" />
                </svg>
              </div>
              <div style="font-size: 0.85rem; font-weight: 700;">Scan QR using any UPI App</div>
              <div class="upi-apps-row">
                <span class="upi-app-btn" onclick="document.getElementById('pay-upi-id').value='${this.driverEmail ? this.driverEmail.split('@')[0] : 'driveease'}@okaxis'">GPay</span>
                <span class="upi-app-btn" onclick="document.getElementById('pay-upi-id').value='${this.driverEmail ? this.driverEmail.split('@')[0] : 'driveease'}@ybl'">PhonePe</span>
                <span class="upi-app-btn" onclick="document.getElementById('pay-upi-id').value='${this.driverEmail ? this.driverEmail.split('@')[0] : 'driveease'}@paytm'">Paytm</span>
                <span class="upi-app-btn" onclick="document.getElementById('pay-upi-id').value='${this.driverEmail ? this.driverEmail.split('@')[0] : 'driveease'}@upi'">BHIM</span>
              </div>
              <div class="form-group" style="width: 100%; text-align: left; margin-top: 10px;">
                <label class="form-label" style="font-size: 0.75rem;">OR ENTER UPI ID / VPA</label>
                <input type="text" id="pay-upi-id" class="form-control" value="${this.driverEmail ? this.driverEmail.split('@')[0] : 'driveease'}@okhdfcbank" />
              </div>
            </div>
          ` : ''}

          ${this.selectedPaymentMethod === 'Net Banking' ? `
            <div style="padding: 10px 0;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.75rem;">SELECT YOUR BANK</label>
                <select id="pay-bank-name" class="form-control">
                  <option selected>HDFC Bank (Instant Approval)</option>
                  <option>ICICI Bank</option>
                  <option>State Bank of India (SBI)</option>
                  <option>Axis Bank</option>
                  <option>Kotak Mahindra Bank</option>
                  <option>Punjab National Bank (PNB)</option>
                </select>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px;">
                You will be seamlessly redirected to your secure demo bank authorization portal.
              </p>
            </div>
          ` : ''}

          ${this.selectedPaymentMethod === 'Wallet' ? `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; text-align: center;">
              <div style="font-size: 0.8rem; color: var(--text-muted);">DRIVEEASE VIP WALLET BALANCE</div>
              <div style="font-size: 1.8rem; font-weight: 800; color: var(--emerald); margin: 6px 0;">₹50,000.00</div>
              <span class="badge badge-success" style="margin-bottom: 12px; display: inline-block;">✓ Sufficient Balance Available</span>
              
              <div class="form-group" style="text-align: left; margin-top: 12px;">
                <label class="form-label" style="font-size: 0.75rem;">OR USE THIRD-PARTY WALLET</label>
                <select id="pay-wallet-name" class="form-control">
                  <option selected>DriveEase VIP Wallet (₹50,000)</option>
                  <option>Paytm Wallet</option>
                  <option>Amazon Pay Balance</option>
                  <option>PhonePe Wallet</option>
                </select>
              </div>
            </div>
          ` : ''}

          ${this.selectedPaymentMethod === 'Pay at Pickup' ? `
            <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; text-align: left;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="font-size: 1.6rem;">🚗</span>
                <div>
                  <h4 style="font-size: 1rem; font-weight: 800; margin: 0; color: var(--text-primary);">Pay upon Vehicle Handover</h4>
                  <span style="font-size: 0.78rem; color: var(--emerald); font-weight: 700;">No Upfront Advance Required</span>
                </div>
              </div>
              <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
                Your booking will be <strong>instantly confirmed and reserved</strong>. You can inspect the vehicle and complete the payment in <strong>Cash, UPI, Debit Card, or Credit Card</strong> directly at your chosen pickup hub (${this.pickupLocation}).
              </p>
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: var(--radius-md); font-size: 0.8rem; color: var(--emerald);">
                ✓ <strong>Zero Cancellation Fees:</strong> Cancel anytime before pickup with no financial obligation.
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
  },

  handlePickupDateChange(newPickup) {
    this.pickupDate = newPickup;
    if (this.returnDate && new Date(this.returnDate) < new Date(newPickup)) {
      const nextDay = new Date(newPickup);
      nextDay.setDate(nextDay.getDate() + 3);
      this.returnDate = nextDay.toISOString().split('T')[0];
    }
    this.revalidateAppliedCoupon();
    this.renderWizard();
  },

  handleReturnDateChange(newReturn) {
    this.returnDate = newReturn;
    this.revalidateAppliedCoupon();
    this.renderWizard();
  },

  toggleAddon(addonId) {
    if (addonId === 'addon_ins') return; // Mandatory zero deductible coverage
    const idx = this.selectedAddOns.indexOf(addonId);
    if (idx > -1) {
      this.selectedAddOns.splice(idx, 1);
    } else {
      this.selectedAddOns.push(addonId);
    }
    this.revalidateAppliedCoupon();
    this.renderWizard();
  },

  async quickApplyCoupon(code) {
    const input = document.getElementById('wizard-coupon-input');
    if (input) input.value = code;
    await this.applyCoupon(code);
  },

  async applyCoupon(forcedCode) {
    const input = document.getElementById('wizard-coupon-input');
    const code = (forcedCode || (input ? input.value : '')).trim().toUpperCase();

    if (!code) {
      showToast('Enter Code', 'Please type a valid coupon code.', 'warning');
      return;
    }

    const pricing = this.calculatePricing();
    const orderAmount = pricing.basePrice + pricing.addOnsTotal;

    try {
      const res = await CouponsAPI.validate(code, orderAmount);
      if (res.valid) {
        this.appliedCoupon = res.code;
        this.discountAmount = res.discountAmount;
        showToast('Coupon Applied! 🎉', `${res.description} (-${formatCurrency(res.discountAmount)})`, 'success');
        this.renderWizard();
      }
    } catch (err) {
      showToast('Invalid Coupon', err.message, 'error');
    }
  },

  async revalidateAppliedCoupon() {
    if (!this.appliedCoupon) return;
    const pricing = this.calculatePricing();
    const orderAmount = pricing.basePrice + pricing.addOnsTotal;
    try {
      const res = await CouponsAPI.validate(this.appliedCoupon, orderAmount);
      if (res.valid) {
        this.discountAmount = res.discountAmount;
      }
    } catch {
      // Coupon no longer meets minimum amount
      this.appliedCoupon = null;
      this.discountAmount = 0;
    }
  },

  removeCoupon() {
    this.appliedCoupon = null;
    this.discountAmount = 0;
    showToast('Coupon Removed', 'Standard pricing restored.', 'info');
    this.renderWizard();
  },

  nextStep() {
    if (this.currentStep === 1) {
      const s = new Date(this.pickupDate);
      const e = new Date(this.returnDate);
      if (!this.pickupDate || !this.returnDate || isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
        showToast('Invalid Dates', 'Please select valid pickup and return dates.', 'error');
        return;
      }

      if (!this.isCarAvailableForDates(this.pickupDate, this.returnDate)) {
        showToast('Unavailable', 'This vehicle is reserved for the selected dates. Please choose alternative dates.', 'warning');
        return;
      }
    }

    if (this.currentStep === 3) {
      // Save current input values before leaving Step 3
      const nameInput = document.getElementById('driver-name');
      const phoneInput = document.getElementById('driver-phone');
      const licenseInput = document.getElementById('driver-license');

      if (nameInput) this.driverName = nameInput.value.trim();
      if (phoneInput) this.driverPhone = phoneInput.value.trim();
      if (licenseInput) this.driverLicense = licenseInput.value.trim();

      if (!this.driverName || this.driverName.length < 2) {
        showToast('Name Required', 'Please enter primary driver full name.', 'error');
        if (nameInput) nameInput.focus();
        return;
      }

      if (!this.driverPhone || this.driverPhone.length < 7) {
        showToast('Phone Required', 'Please enter a valid phone number.', 'error');
        if (phoneInput) phoneInput.focus();
        return;
      }

      if (!this.driverLicense || this.driverLicense.length < 4) {
        showToast('License Required', 'Please enter driver license number.', 'error');
        if (licenseInput) licenseInput.focus();
        return;
      }
    }

    this.currentStep++;
    this.renderWizard();
  },

  prevStep() {
    if (this.currentStep > 1) {
      // Save driver inputs if going back from Step 3
      if (this.currentStep === 3) {
        const nameInput = document.getElementById('driver-name');
        const phoneInput = document.getElementById('driver-phone');
        const licenseInput = document.getElementById('driver-license');
        if (nameInput) this.driverName = nameInput.value.trim();
        if (phoneInput) this.driverPhone = phoneInput.value.trim();
        if (licenseInput) this.driverLicense = licenseInput.value.trim();
      }

      this.currentStep--;
      this.renderWizard();
    }
  },

  // Process Demo Payment
  async processDemoPayment() {
    if (this.isSubmitting) return;

    if (!State.token || !State.user) {
      showToast('Login Required', 'Please log in to book a car.', 'info');
      closeModal('booking-wizard-modal');
      App.openAuthModal('signin');
      return;
    }

    try {
      this.isSubmitting = true;
      this.renderWizard();

      const pricing = this.calculatePricing();
      const driverName = this.driverName || State.user?.name || 'Customer';
      const driverPhone = this.driverPhone || State.user?.phone || '+91 98765 00000';

      // 1. Prepare Add-ons
      const formattedAddOns = this.selectedAddOns.map(id => {
        const a = this.availableAddOns.find(item => item.id === id);
        return {
          name: a.name,
          price: a.id === 'addon_ins' ? pricing.insurancePrice : a.price
        };
      });

      // 2. Create Booking via API
      const bookingRes = await BookingsAPI.create({
        carId: this.selectedCar.id,
        pickupLocation: this.pickupLocation,
        returnLocation: this.returnLocation,
        pickupDate: this.pickupDate,
        returnDate: this.returnDate,
        pickupTime: this.pickupTime,
        returnTime: this.returnTime,
        addOns: formattedAddOns,
        couponCode: this.appliedCoupon,
        customerName: driverName,
        customerPhone: driverPhone
      });

      const booking = bookingRes.booking;

      // 3. Process Demo Payment via API
      const isPayAtPickup = this.selectedPaymentMethod === 'Pay at Pickup';
      const debitNum = document.getElementById('pay-debit-number')?.value?.replace(/\D/g, '') || '';
      const debitLast4 = debitNum.length >= 4 ? debitNum.slice(-4) : '8821';

      const paymentRes = await PaymentsAPI.process({
        bookingId: booking.id,
        method: this.selectedPaymentMethod,
        cardLast4: this.selectedPaymentMethod === 'Credit Card' ? '4242' : (this.selectedPaymentMethod === 'Debit Card' ? debitLast4 : null),
        upiId: document.getElementById('pay-upi-id')?.value || `${driverName.toLowerCase().replace(/\s+/g, '')}@okaxis`,
        bankName: document.getElementById('pay-bank-name')?.value || 'HDFC Bank',
        walletName: document.getElementById('pay-wallet-name')?.value || 'DriveEase VIP Wallet'
      });

      this.createdBooking = {
        ...booking,
        paymentStatus: paymentRes.payment ? paymentRes.payment.status : (isPayAtPickup ? 'Pay at Pickup' : 'Paid'),
        paymentMethod: this.selectedPaymentMethod,
        paymentId: paymentRes.payment ? paymentRes.payment.id : `PAY-${Math.floor(10000 + Math.random() * 90000)}`
      };

      this.isSubmitting = false;
      closeModal('booking-wizard-modal');
      this.showConfirmation(this.createdBooking);
    } catch (err) {
      this.isSubmitting = false;
      this.renderWizard();
      showToast('Booking Failed', err.message, 'error');
    }
  },

  // Confirmation Celebration Screen
  showConfirmation(booking) {
    const modalBody = document.getElementById('confirmation-modal-body');
    if (!modalBody) return;

    const isPayAtPickup = (booking.paymentStatus === 'Pay at Pickup');

    modalBody.innerHTML = `
      <div class="booking-success-box">
        <div class="success-icon-anim">✓</div>
        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 4px; color: var(--text-primary);">
          ${isPayAtPickup ? 'Reservation Confirmed!' : 'Booking Confirmed!'}
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          ${isPayAtPickup 
            ? 'Your luxury vehicle has been reserved. Complete payment upon vehicle collection.' 
            : 'Your luxury vehicle has been reserved and prepared for pickup.'}
        </p>

        <div class="booking-ref-badge">
          BOOKING REFERENCE: ${booking.id}
        </div>

        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 20px; margin: 20px 0; text-align: left;">
          <div style="display: flex; gap: 14px; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 14px;">
            <img src="${booking.carImage}" alt="${booking.carName}" style="width: 80px; height: 50px; object-fit: cover; border-radius: var(--radius-md);" />
            <div>
              <h4 style="font-size: 1rem; font-weight: 700;">${booking.carName}</h4>
              <span class="badge ${isPayAtPickup ? 'badge-warning' : 'badge-success'}">
                ${isPayAtPickup ? '✓ Reserved (Pay at Pickup)' : '✓ Confirmed & Paid'}
              </span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem; color: var(--text-secondary);">
            <div><strong>Pickup:</strong> ${formatDate(booking.pickupDate)} (${booking.pickupTime})</div>
            <div><strong>Return:</strong> ${formatDate(booking.returnDate)} (${booking.returnTime})</div>
            <div><strong>Location:</strong> ${booking.pickupLocation}</div>
            <div><strong>${isPayAtPickup ? 'Payable at Pickup:' : 'Total Paid:'}</strong> <span style="color: var(--emerald); font-weight: 800;">${formatCurrency(booking.totalAmount)}</span></div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="closeModal('confirmation-modal'); Booking.openPrintReceipt('${booking.id}')">
            🖨️ Print Tax Invoice
          </button>
          <button class="btn btn-primary" onclick="closeModal('confirmation-modal'); App.navigateTo('#user-bookings')">
            View in My Bookings ➔
          </button>
        </div>
      </div>
    `;

    openModal('confirmation-modal');
  },

  // Open Printable Tax Invoice Receipt
  async openPrintReceipt(bookingId) {
    try {
      if (!bookingId) {
        showToast('Invalid Request', 'No booking ID specified for invoice generation.', 'warning');
        return;
      }

      const booking = await BookingsAPI.getById(bookingId);
      if (!booking) {
        showToast('Invoice Not Found', `Unable to find booking record #${bookingId}.`, 'error');
        return;
      }

      const modalBody = document.getElementById('receipt-modal-body');
      if (!modalBody) return;

      const days = Number(booking.days) || 1;
      const perDayRate = (booking.carDetails && booking.carDetails.pricePerDay) ? booking.carDetails.pricePerDay : Math.round((Number(booking.basePrice) || 0) / days);
      const invoiceNum = `INV-${booking.id}`;
      const invoiceDate = formatDate(booking.createdAt || new Date());
      const customerName = booking.userName || (booking.customerDetails && booking.customerDetails.name) || 'Valued Customer';
      const customerEmail = booking.userEmail || (booking.customerDetails && booking.customerDetails.email) || 'N/A';
      const customerPhone = booking.userPhone || (booking.customerDetails && booking.customerDetails.phone) || 'N/A';
      const customerLicense = (booking.customerDetails && booking.customerDetails.licenseNumber) || 'Verified on file';
      const vehicleName = booking.carName || (booking.carDetails && booking.carDetails.name) || 'Luxury Vehicle';
      const vehicleBrand = booking.carBrand || (booking.carDetails && booking.carDetails.brand) || 'DriveEase Fleet';
      const pickupInfo = `${formatDate(booking.pickupDate)} (${booking.pickupTime || '10:00 AM'}) — ${booking.pickupLocation || 'Mumbai Hub'}`;
      const returnInfo = `${formatDate(booking.returnDate)} (${booking.returnTime || '06:00 PM'}) — ${booking.returnLocation || booking.pickupLocation || 'Mumbai Hub'}`;
      const paymentRef = booking.paymentId || `PAY-${booking.id}`;
      const paymentMethod = booking.paymentMethod || 'Credit Card / UPI';
      const paymentStatus = (booking.paymentStatus || 'Paid').toUpperCase();
      const subtotalAmount = (Number(booking.basePrice) || 0) + (Number(booking.addOnsPrice) || 0);

      modalBody.innerHTML = `
        <div id="printable-invoice" style="background: #ffffff; color: #0f172a; padding: 32px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header Branding -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 1.5rem;">🚗</span>
                <h1 style="font-size: 1.8rem; color: #1e3a8a; margin: 0; font-weight: 800; letter-spacing: -0.5px;">DriveEase</h1>
              </div>
              <p style="font-size: 0.82rem; color: #64748b; line-height: 1.4; margin: 0;">
                DriveEase Luxury Car Rentals India Pvt. Ltd.<br />
                GSTIN: 27AABCS1429B1Z8 | CIN: U50100MH2024PTC129482<br />
                Chhatrapati Shivaji Maharaj International Airport Hub, Mumbai - 400099
              </p>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background: #e0e7ff; color: #3730a3; font-weight: 800; font-size: 0.75rem; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 6px;">Official Tax Invoice</span>
              <h3 style="font-size: 1.25rem; color: #0f172a; font-weight: 800; margin: 0;">TAX INVOICE</h3>
              <div style="font-size: 0.88rem; color: #1e3a8a; font-weight: 700; margin-top: 4px;">Invoice #: ${invoiceNum}</div>
              <div style="font-size: 0.82rem; color: #64748b;">Booking Ref: <strong>#${booking.id}</strong></div>
              <div style="font-size: 0.82rem; color: #64748b;">Date of Issue: ${invoiceDate}</div>
            </div>
          </div>

          <!-- Customer & Trip Details Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 0.85rem; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div>
              <strong style="color: #1e3a8a; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Billed To (Customer):</strong>
              <div style="margin-top: 6px; line-height: 1.5;">
                <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a;">${customerName}</div>
                <div>Email: ${customerEmail}</div>
                <div>Phone: ${customerPhone}</div>
                <div>License: <span style="font-family: monospace; font-weight: 600;">${customerLicense}</span></div>
              </div>
            </div>
            <div>
              <strong style="color: #1e3a8a; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Rental & Itinerary Details:</strong>
              <div style="margin-top: 6px; line-height: 1.5;">
                <div>Vehicle: <strong>${vehicleName}</strong> (${vehicleBrand})</div>
                <div>Duration: <strong>${days} Days</strong></div>
                <div>Pickup: <strong>${pickupInfo}</strong></div>
                <div>Return: <strong>${returnInfo}</strong></div>
              </div>
            </div>
          </div>

          <!-- Itemized Line Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.88rem;">
            <thead>
              <tr style="background: #1e3a8a; color: #ffffff;">
                <th style="padding: 10px 12px; text-align: left; font-weight: 700; border-top-left-radius: 6px;">Description & Particulars</th>
                <th style="padding: 10px 12px; text-align: center; font-weight: 700;">Rate / Unit</th>
                <th style="padding: 10px 12px; text-align: center; font-weight: 700;">Qty / Duration</th>
                <th style="padding: 10px 12px; text-align: right; font-weight: 700; border-top-right-radius: 6px;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <!-- Base Vehicle Rental -->
              <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                <td style="padding: 10px 12px;">
                  <strong>Base Vehicle Rental</strong><br />
                  <span style="font-size: 0.78rem; color: #64748b;">${vehicleName} — Premium Self-Drive Fleet</span>
                </td>
                <td style="padding: 10px 12px; text-align: center;">${formatCurrency(perDayRate)} / day</td>
                <td style="padding: 10px 12px; text-align: center;">${days} Days</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${formatCurrency(booking.basePrice)}</td>
              </tr>

              <!-- Add-ons & Insurance -->
              ${(booking.addOns && booking.addOns.length > 0) ? booking.addOns.map(a => `
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                  <td style="padding: 10px 12px;">
                    ${a.name}<br />
                    <span style="font-size: 0.78rem; color: #64748b;">Included service package</span>
                  </td>
                  <td style="padding: 10px 12px; text-align: center;">Flat / Trip</td>
                  <td style="padding: 10px 12px; text-align: center;">1 Package</td>
                  <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${formatCurrency(a.price)}</td>
                </tr>
              `).join('') : ''}

              <!-- Subtotal Line -->
              <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.85rem;">
                <td style="padding: 8px 12px;" colspan="3"><strong>Gross Subtotal (Rental + Add-ons)</strong></td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700;">${formatCurrency(subtotalAmount)}</td>
              </tr>

              <!-- Discount if applied -->
              ${booking.discount > 0 ? `
                <tr style="border-bottom: 1px solid #e2e8f0; background: #f0fdf4; color: #16a34a;">
                  <td style="padding: 8px 12px;" colspan="3">
                    <strong>Special Promo Discount (Coupon: ${booking.couponCode || 'PROMO'})</strong>
                  </td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 700;">-${formatCurrency(booking.discount)}</td>
                </tr>
              ` : ''}

              <!-- Integrated GST 18% -->
              <tr style="border-bottom: 2px solid #cbd5e1; background: #ffffff;">
                <td style="padding: 10px 12px;" colspan="3">
                  <strong>Integrated GST (IGST @ 18.00%)</strong><br />
                  <span style="font-size: 0.78rem; color: #64748b;">SAC Code: 996601 (Rental of passenger transport vehicles)</span>
                </td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${formatCurrency(booking.tax)}</td>
              </tr>

              <!-- Total Final Amount -->
              <tr style="font-weight: 800; font-size: 1.15rem; background: #f1f5f9; color: #1e3a8a;">
                <td style="padding: 14px 12px; border-bottom-left-radius: 6px;" colspan="3">TOTAL INVOICE AMOUNT (INR)</td>
                <td style="padding: 14px 12px; text-align: right; color: #1e3a8a; border-bottom-right-radius: 6px;">${formatCurrency(booking.totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Settlement, Payment Proof & Signatory Block -->
          <div style="font-size: 0.82rem; color: #475569; border-top: 2px solid #e2e8f0; padding-top: 16px; display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: center;">
            <div>
              <div style="margin-bottom: 4px;">Payment Status: <strong style="color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 4px;">✓ ${paymentStatus}</strong></div>
              <div style="margin-bottom: 4px;">Payment Method: <strong>${paymentMethod}</strong></div>
              <div>Transaction Reference: <strong style="font-family: monospace; color: #1e3a8a;">${paymentRef}</strong></div>
              <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 6px;">This is a computer-generated tax invoice issued in accordance with GST regulations.</div>
            </div>
            <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 16px;">
              <div style="font-weight: 700; color: #1e3a8a; margin-bottom: 30px;">DriveEase Authorized Signatory</div>
              <div style="font-size: 0.75rem; color: #64748b; border-top: 1px dashed #cbd5e1; display: inline-block; padding-top: 4px; min-width: 140px;">Accounts & Billing Dept</div>
            </div>
          </div>
        </div>

        <!-- Action Controls (Hidden on Print) -->
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;" class="no-print">
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="btn btn-primary" onclick="closeModal('receipt-modal')">Close</button>
        </div>
      `;

      openModal('receipt-modal');
    } catch (err) {
      showToast('Error', 'Unable to generate receipt: ' + (err.message || 'Unknown error'), 'error');
    }
  }
};
