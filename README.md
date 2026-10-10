# DriveEase — Premium Luxury Car Rental Platform 🚗✨

A full-stack, enterprise-grade luxury car rental application built with **Node.js, Express, Vanilla JavaScript, and Google Identity Services**. DriveEase offers a seamless vehicle reservation experience, complete with fleet management, customer and admin dashboards, role-based JWT security, and interactive demo payment processing.

---

## 🌟 Key Features

- **🏎️ Curated Luxury Fleet**: 24 luxury vehicles across Sedan, SUV, Sports, and Electric categories (BMW, Mercedes-Benz, Porsche, Audi, Range Rover, Lamborghini, Rolls-Royce) with real-time specs, features, and pricing.
- **🔒 Mandatory Authentication & Security**:
  - Secure JWT authentication with `bcryptjs` password encryption.
  - Google Sign-In & Sign-Up powered by Google Identity Services (GIS).
  - Customer data isolation & multi-tenant access control.
  - Date overlap collision protection preventing double bookings.
- **💳 Multi-Method Demo Payment Gateway**:
  - 6 Indian payment methods: **UPI (Google Pay / PhonePe / Paytm), Debit Card, Credit Card, Net Banking, DriveEase VIP Wallet, and Pay at Pickup**.
  - Interactive payment simulator with real-time status updates and duplicate submission protection.
- **🧾 Instant Tax Invoice Generation**:
  - Client-side official GST tax invoice generation with print/PDF export styling.
- **👑 Fleet Administrator Portal**:
  - Comprehensive analytics, dynamic KPI metrics, revenue/profit calculations, and top-performing vehicle leaderboards.
  - Real-time fleet status management, maintenance expense recording, user management, and CSV report export.
- **👤 Customer Dashboard**:
  - Personalized vehicle recommendations, active rental key management, booking history, favourites, and notification center.

---

## ⚠️ Demo Credentials & Security Disclaimer

> [!IMPORTANT]
> **FOR DEMO & EVALUATION PURPOSES ONLY**
> The demo credentials listed below are provided solely for testing in a local development environment. For production deployments, always configure unique administrative credentials and inject secrets via environment variables.

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **👑 Fleet Admin** | `admin@driveease.com` | `admin123` | Full administrative control & analytics |
| **👤 Demo Customer** | `john.doe@example.com` | `john123` | Standard customer booking & portal access |

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/Amisha124/DriveEase-Car-Rental-System.git
cd DriveEase-Car-Rental-System

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### 3. Configure Environment Variables
Open `.env` and set your configuration:
```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 4. Start the Application
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Automated Testing

DriveEase includes a comprehensive test suite covering authentication, security, and administrative workflows:

```bash
# Run Google OAuth security test suite
node tests/test_google_auth.js

# Run Booking Authentication & Authorization test suite (Tests A - J)
node tests/test_security_booking_auth_a_to_j.js

# Run full multi-suite verification (36 test suites)
node tests/e2e_api_test.js
```

---

## 📂 Project Architecture

```
DriveEase-Car-Rental-System/
├── data/                  # Local JSON data storage (auto-seeded on startup)
│   ├── cars.json          # 24 luxury fleet vehicles
│   ├── users.json         # User profiles and hashed credentials
│   ├── bookings.json      # Reservation records
│   ├── payments.json      # Payment transaction logs
│   ├── coupons.json       # Promotional discount codes
│   └── ...
├── middleware/            # JWT authentication & role-guard middleware
├── public/                # Frontend Single Page Application
│   ├── css/               # Modern responsive styling & themes
│   ├── js/                # Modular controllers (App, AuthAPI, Booking, Dashboards)
│   └── index.html         # Main SPA entry point
├── routes/                # Express REST API endpoints
├── services/              # Atomic JSON storage service (db.js)
├── tests/                 # Automated end-to-end test suites
├── server.js              # Express server entry point
├── .env.example           # Environment template
├── .gitignore             # Git exclusions
└── package.json           # Dependencies and scripts
```

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).
