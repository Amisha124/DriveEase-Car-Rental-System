const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// In-memory mutex per collection to prevent concurrent write collisions
const locks = {};
async function acquireLock(collection) {
  while (locks[collection]) {
    await new Promise(r => setTimeout(r, 10));
  }
  locks[collection] = true;
}
function releaseLock(collection) {
  locks[collection] = false;
}

// File path for collection
function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

// Read collection
async function read(collection) {
  await ensureDir();
  const filePath = getFilePath(collection);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf-8');
      return [];
    }
    throw err;
  }
}

// Write collection atomically
async function write(collection, data) {
  await ensureDir();
  await acquireLock(collection);
  try {
    const filePath = getFilePath(collection);
    const content = JSON.stringify(data, null, 2);
    const tempPath = `${filePath}.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await fs.writeFile(tempPath, content, 'utf-8');
    
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await fs.rename(tempPath, filePath);
        break;
      } catch (err) {
        if (attempt < 4 && (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES')) {
          await new Promise(r => setTimeout(r, 20 * (attempt + 1)));
        } else {
          await fs.writeFile(filePath, content, 'utf-8');
          try { await fs.unlink(tempPath); } catch (e) {}
          break;
        }
      }
    }
    return data;
  } finally {
    releaseLock(collection);
  }
}

// Find items matching query object or predicate
async function find(collection, query = {}) {
  const items = await read(collection);
  if (typeof query === 'function') {
    return items.filter(query);
  }
  return items.filter(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  });
}

// Find single item
async function findOne(collection, query = {}) {
  const items = await read(collection);
  if (typeof query === 'function') {
    return items.find(query) || null;
  }
  return items.find(item => {
    return Object.keys(query).every(key => item[key] === query[key]);
  }) || null;
}

// Insert item
async function insert(collection, item) {
  const items = await read(collection);
  const newItem = {
    id: item.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  await write(collection, items);
  return newItem;
}

// Update items matching query
async function update(collection, query, updates) {
  const items = await read(collection);
  let updatedCount = 0;
  const updatedItems = items.map(item => {
    let match = false;
    if (typeof query === 'function') {
      match = query(item);
    } else {
      match = Object.keys(query).every(key => item[key] === query[key]);
    }
    if (match) {
      updatedCount++;
      return {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }
    return item;
  });
  if (updatedCount > 0) {
    await write(collection, updatedItems);
  }
  return updatedCount;
}

// Update single item by ID
async function updateById(collection, id, updates) {
  const items = await read(collection);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;
  const updated = {
    ...items[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  items[index] = updated;
  await write(collection, items);
  return updated;
}

// Remove items matching query
async function remove(collection, query) {
  const items = await read(collection);
  let removedCount = 0;
  const remaining = items.filter(item => {
    let match = false;
    if (typeof query === 'function') {
      match = query(item);
    } else {
      match = Object.keys(query).every(key => item[key] === query[key]);
    }
    if (match) {
      removedCount++;
      return false;
    }
    return true;
  });
  if (removedCount > 0) {
    await write(collection, remaining);
  }
  return removedCount;
}

// Remove single item by ID
async function removeById(collection, id) {
  return await remove(collection, { id });
}

// Seed Initial realistic data
async function seedInitialData() {
  await ensureDir();

  // 1. Seed Users
  const users = await read('users');
  if (users.length === 0) {
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const customerPasswordHash = await bcrypt.hash('john123', 10);
    const demoUsers = [
      {
        id: 'usr_admin_01',
        name: 'Admin',
        email: 'admin@driveease.com',
        password: adminPasswordHash,
        role: 'ADMIN',
        title: 'Super Administrator',
        phone: '+91 98765 43210',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: '2025-01-10T10:00:00.000Z',
        status: 'Active',
        totalBookings: 0,
        totalSpent: 0
      },
      {
        id: 'usr_cust_01',
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: customerPasswordHash,
        role: 'CUSTOMER',
        membership: 'Premium Member',
        phone: '+91 98234 56789',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        address: 'Bandra West, Mumbai, Maharashtra 400050',
        licenseNumber: 'MH-01-2018-0094821',
        licenseExpiry: '2030-05-15',
        profileCompletion: 80,
        createdAt: '2025-01-15T12:30:00.000Z',
        status: 'Active',
        totalBookings: 8,
        totalSpent: 124500
      },
      {
        id: 'usr_cust_02',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        password: customerPasswordHash,
        role: 'CUSTOMER',
        membership: 'Executive Member',
        phone: '+91 98112 34567',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        address: 'Indiranagar, Bangalore, Karnataka 560038',
        licenseNumber: 'KA-03-2020-0043129',
        licenseExpiry: '2032-11-20',
        profileCompletion: 100,
        createdAt: '2025-02-01T09:15:00.000Z',
        status: 'Active',
        totalBookings: 5,
        totalSpent: 78000
      },
      {
        id: 'usr_cust_03',
        name: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        password: customerPasswordHash,
        role: 'CUSTOMER',
        membership: 'Standard Member',
        phone: '+91 98777 12345',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        address: 'Connaught Place, New Delhi 110001',
        licenseNumber: 'DL-04-2019-0012893',
        licenseExpiry: '2029-08-10',
        profileCompletion: 90,
        createdAt: '2025-03-12T14:45:00.000Z',
        status: 'Active',
        totalBookings: 3,
        totalSpent: 42600
      },
      {
        id: 'usr_cust_04',
        name: 'Sneha Patel',
        email: 'sneha.patel@example.com',
        password: customerPasswordHash,
        role: 'CUSTOMER',
        membership: 'Gold Member',
        phone: '+91 98980 98980',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        address: 'Satellite, Ahmedabad, Gujarat 380015',
        licenseNumber: 'GJ-01-2021-0087452',
        licenseExpiry: '2033-02-28',
        profileCompletion: 85,
        createdAt: '2025-04-05T16:20:00.000Z',
        status: 'Active',
        totalBookings: 6,
        totalSpent: 96400
      },
      {
        id: 'usr_cust_05',
        name: 'Amit Singh',
        email: 'amit.singh@example.com',
        password: customerPasswordHash,
        role: 'CUSTOMER',
        membership: 'Standard Member',
        phone: '+91 98222 33445',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        address: 'Cyber City, Gurugram, Haryana 122002',
        licenseNumber: 'HR-26-2022-0056123',
        licenseExpiry: '2034-09-14',
        profileCompletion: 70,
        createdAt: '2025-05-18T11:00:00.000Z',
        status: 'Active',
        totalBookings: 2,
        totalSpent: 35000
      }
    ];
    await write('users', demoUsers);
  }

  // 2. Seed Cars
  const cars = await read('cars');
  if (cars.length === 0) {
    const demoCars = [
      {
        id: 'car_bmw_5',
        name: 'BMW 5 Series',
        brand: 'BMW',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 8000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '14.8 km/l',
        power: '252 HP',
        acceleration: '6.2s (0-100)',
        topSpeed: '250 km/h',
        rating: 4.9,
        reviewsCount: 128,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport (BOM) & Downtown',
        description: 'The BMW 5 Series embodies modern business elegance with cutting-edge executive dynamics, TwinPower Turbo precision, and sumptuous Vernasca leather interiors.',
        features: [
          'Apple CarPlay & Android Auto',
          'Panoramic Sunroof',
          'Harman Kardon Surround Sound',
          'Adaptive Cruise Control',
          '360° Parking Camera',
          'Ventilated Seats',
          'Wireless Phone Charging',
          'Ambient Interior Lighting'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup. 100% refund guaranteed.',
        totalBookings: 32,
        totalEarnings: 208000,
        maintenanceCost: 18000
      },
      {
        id: 'car_merc_c',
        name: 'Mercedes C-Class',
        brand: 'Mercedes-Benz',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 6500,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '16.2 km/l',
        power: '204 HP',
        acceleration: '7.3s (0-100)',
        topSpeed: '246 km/h',
        rating: 4.8,
        reviewsCount: 120,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport & Delhi NCR',
        description: 'Experience refined comfort and intelligence with the Mercedes-Benz C-Class. Fitted with the MBUX portrait touch display, agility control suspension, and handcrafted upholstery.',
        features: [
          'MBUX Voice Assistant',
          'Active Brake Assist',
          'Burmester 3D Sound System',
          'Heated Front Seats',
          'Digital LED Headlights',
          'Keyless-GO Comfort Package'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to booking start time.',
        totalBookings: 16,
        totalEarnings: 98400,
        maintenanceCost: 9500
      },
      {
        id: 'car_toyota_fortuner',
        name: 'Toyota Fortuner Legender',
        brand: 'Toyota',
        type: 'SUV',
        year: 2024,
        pricePerDay: 7500,
        seats: 7,
        transmission: 'Automatic',
        fuel: 'Diesel',
        mileage: '14.2 km/l',
        power: '201 HP',
        acceleration: '9.8s (0-100)',
        topSpeed: '190 km/h',
        rating: 4.7,
        reviewsCount: 98,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: false,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Bangalore, Goa & Delhi NCR',
        description: 'Command every road and trail with the mighty Toyota Fortuner Legender 4x4. Generous 7-seat layout, colossal road presence, and indestructible Japanese durability.',
        features: [
          '4x4 Terrain Management',
          '7 Luxurious Leather Seats',
          'JBL 11-Speaker Audio',
          'Hill Assist & Descent Control',
          'Kick-Sensor Powered Tailgate',
          'Wireless Apple CarPlay'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup.',
        totalBookings: 27,
        totalEarnings: 121500,
        maintenanceCost: 8200
      },
      {
        id: 'car_audi_a6',
        name: 'Audi A6 Matrix',
        brand: 'Audi',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 8000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '14.1 km/l',
        power: '241 HP',
        acceleration: '6.8s (0-100)',
        topSpeed: '250 km/h',
        rating: 4.9,
        reviewsCount: 76,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1541348263662-e0c8666c8916?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport (BOM) & Bangalore',
        description: 'Audi A6 combines progressive progressive aesthetics with intuitive dual-touchscreen MMI navigation, Quattro all-wheel drive stability, and whisper-quiet cabin acoustics.',
        features: [
          'Audi Virtual Cockpit Plus',
          'Bang & Olufsen 3D Sound',
          'Matrix LED Headlamps',
          'Air Ionizer & Fragrance System',
          'Lane Departure Warning'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
        totalBookings: 18,
        totalEarnings: 136800,
        maintenanceCost: 11000
      },
      {
        id: 'car_range_rover_sport',
        name: 'Range Rover Sport',
        brand: 'Range Rover',
        type: 'SUV',
        year: 2024,
        pricePerDay: 12000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Diesel',
        mileage: '12.5 km/l',
        power: '345 HP',
        acceleration: '5.9s (0-100)',
        topSpeed: '242 km/h',
        rating: 4.8,
        reviewsCount: 64,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Goa, Bangalore & Hyderabad',
        description: 'The pinnacle of assertive luxury. Dynamic Air Suspension, Terrain Response 2, and handcrafted Windsor leather seats make the Range Rover Sport unmatched.',
        features: [
          'Dynamic Air Suspension',
          'Meridian Signature 800W Sound',
          'Heads-Up Holographic Display',
          'Executive Rear Seating',
          'Soft-Close Doors'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to pickup.',
        totalBookings: 14,
        totalEarnings: 92000,
        maintenanceCost: 14500
      },
      {
        id: 'car_porsche_911',
        name: 'Porsche 911 Carrera S',
        brand: 'Porsche',
        type: 'Sports',
        year: 2024,
        pricePerDay: 22000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '10.8 km/l',
        power: '443 HP',
        acceleration: '3.5s (0-100)',
        topSpeed: '308 km/h',
        rating: 5.0,
        reviewsCount: 42,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai & Delhi NCR Exclusive Hub',
        description: 'An automotive icon. The twin-turbo flat-six engine delivers exhilarating precision, iconic silhouette, and pure track-bred pedigree.',
        features: [
          'Sport Chrono Package',
          'Porsche Active Suspension (PASM)',
          'Bose Surround Sound System',
          'Sport Exhaust System with Twin Tailpipes',
          'Launch Control'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours before pickup.',
        totalBookings: 11,
        totalEarnings: 154000,
        maintenanceCost: 19000
      },
      {
        id: 'car_tesla_model_s',
        name: 'Tesla Model S Plaid',
        brand: 'Tesla',
        type: 'Electric',
        year: 2024,
        pricePerDay: 15000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Electric',
        mileage: '600 km Range',
        power: '1,020 HP',
        acceleration: '1.99s (0-100)',
        topSpeed: '322 km/h',
        rating: 4.9,
        reviewsCount: 55,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Bangalore & Hyderabad',
        description: 'Beyond supercar speed with tri-motor all-wheel drive, cinematic 17-inch gaming display, and state-of-the-art Autopilot capabilities.',
        features: [
          'Tri-Motor All-Wheel Drive',
          'Yoke Steering Wheel',
          '17" Cinematic Gaming Screen',
          'Enhanced Autopilot & Summon',
          'Wireless Multi-Device Fast Charging',
          'HEPA Air Filtration System'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
        totalBookings: 19,
        totalEarnings: 182000,
        maintenanceCost: 6500
      },
      {
        id: 'car_merc_g63',
        name: 'Mercedes-AMG G 63',
        brand: 'Mercedes-Benz',
        type: 'Luxury',
        year: 2024,
        pricePerDay: 28000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '8.5 km/l',
        power: '577 HP',
        acceleration: '4.5s (0-100)',
        topSpeed: '240 km/h',
        rating: 5.0,
        reviewsCount: 38,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport & Delhi VIP Lounges',
        description: 'The legendary G-Wagon. Handcrafted AMG 4.0-liter V8 biturbo engine, side-exit performance exhausts, and unmistakable imposing presence.',
        features: [
          'Handcrafted AMG V8 Biturbo',
          '3 Differential Locks',
          'Designo Exclusive Nappa Leather',
          'Burmester High-End 3D Surround',
          'AMG Performance Exhaust'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to trip.',
        totalBookings: 9,
        totalEarnings: 196000,
        maintenanceCost: 22000
      },
      {
        id: 'car_audi_etron',
        name: 'Audi RS e-tron GT',
        brand: 'Audi',
        type: 'Electric',
        year: 2024,
        pricePerDay: 19000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Electric',
        mileage: '480 km Range',
        power: '637 HP',
        acceleration: '3.3s (0-100)',
        topSpeed: '250 km/h',
        rating: 4.8,
        reviewsCount: 31,
        status: 'Available',
        featured: false,
        popular: false,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Bangalore & Pune',
        description: 'Electric mobility elevated to sculptural art. 800-volt high-speed charging, quattro electric all-wheel drive, and aerodynamically sculpted body lines.',
        features: [
          'Electric Quattro All-Wheel Drive',
          '800V High-Speed Fast Charging',
          'Carbon Roof & Ceramic Brakes',
          'Matrix Laser Headlamps'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup.',
        totalBookings: 8,
        totalEarnings: 114000,
        maintenanceCost: 5500
      },
      {
        id: 'car_hyundai_ioniq5',
        name: 'Hyundai Ioniq 5',
        brand: 'Hyundai',
        type: 'Electric',
        year: 2024,
        pricePerDay: 5500,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Electric',
        mileage: '530 km Range',
        power: '217 HP',
        acceleration: '7.6s (0-100)',
        topSpeed: '185 km/h',
        rating: 4.7,
        reviewsCount: 49,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: false,
        image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Pune, Bangalore, Delhi & Goa',
        description: 'Futuristic Parametric Pixel design with a spacious flat-floor lounge cabin, ultra-fast 350kW DC charging, and Vehicle-to-Load (V2L) power.',
        features: [
          'Parametric Pixel LED Design',
          'Relaxation Comfort Front Seats',
          'Vehicle-to-Load (V2L) Power Outlet',
          'SmartSense Level 2 ADAS'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
        totalBookings: 22,
        totalEarnings: 88000,
        maintenanceCost: 4000
      },
      {
        id: 'car_volvo_xc90',
        name: 'Volvo XC90 Recharge',
        brand: 'Volvo',
        type: 'SUV',
        year: 2024,
        pricePerDay: 11000,
        seats: 7,
        transmission: 'Automatic',
        fuel: 'Hybrid',
        mileage: '22.0 km/l',
        power: '455 HP',
        acceleration: '5.3s (0-100)',
        topSpeed: '180 km/h',
        rating: 4.9,
        reviewsCount: 52,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai & Bangalore',
        description: 'Scandinavian sanctuary with 7 full-sized seats, Orrefors crystal gear shifter, Bowers & Wilkins audio, and the world standard in automotive safety.',
        features: [
          'Bowers & Wilkins 19-Speaker Audio',
          'Orrefors Swedish Crystal Shifter',
          'Pilot Assist Semi-Autonomous Drive',
          'Air Purifier PM2.5 Filtration',
          '7 Executive Leather Seats'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours before pickup.',
        totalBookings: 15,
        totalEarnings: 112000,
        maintenanceCost: 9000
      },
      {
        id: 'car_mustang_gt',
        name: 'Ford Mustang GT Fastback',
        brand: 'Ford',
        type: 'Sports',
        year: 2024,
        pricePerDay: 14000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '9.2 km/l',
        power: '450 HP',
        acceleration: '4.3s (0-100)',
        topSpeed: '250 km/h',
        rating: 4.8,
        reviewsCount: 67,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Goa & Bangalore',
        description: 'Raw American muscle powered by a roaring 5.0-litre Coyote V8 engine. Track apps, active valve performance exhaust, and unmistakable silhouette.',
        features: [
          '5.0L Coyote V8 Engine',
          'Active Valve Performance Exhaust',
          'Track Apps with Line Lock',
          'MagneRide Damping System',
          '12" Digital Instrument Cluster'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
        totalBookings: 20,
        totalEarnings: 168000,
        maintenanceCost: 13000
      },
      {
        id: 'car_lambo_urus',
        name: 'Lamborghini Urus S',
        brand: 'Lamborghini',
        type: 'SUV',
        year: 2025,
        pricePerDay: 35000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '7.8 km/l',
        power: '657 HP',
        acceleration: '3.5s (0-100)',
        topSpeed: '305 km/h',
        rating: 5.0,
        reviewsCount: 18,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport (BOM) & Delhi VIP Lounges',
        description: 'Super SUV marrying genuine supercar ferocity with executive luxury. Twin-turbo V8 powertrain, carbon ceramic brakes, ANIMA drive mode selector, and sumptuous Q-Citura leather upholstery.',
        features: [
          '4.0L Twin-Turbo 657 HP V8',
          'ANIMA Driving Dynamics (Corsa / Sabbia)',
          'Carbon Ceramic Braking System',
          'Bang & Olufsen 3D Advanced Sound',
          'Panoramic Glass Sunroof',
          'Q-Citura Diamond Leather Seats'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 12,
        totalEarnings: 210000,
        maintenanceCost: 28000
      },
      {
        id: 'car_merc_s_class',
        name: 'Mercedes-Benz S-Class S 450',
        brand: 'Mercedes-Benz',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 20000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '12.8 km/l',
        power: '367 HP',
        acceleration: '5.1s (0-100)',
        topSpeed: '250 km/h',
        rating: 5.0,
        reviewsCount: 34,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport (BOM) & Delhi NCR',
        description: 'The global benchmark in luxury motoring. First-class rear executive suite, 4D Burmester sound, and active road surface scanning suspension.',
        features: [
          'First-Class Rear Executive Suite',
          'Burmester High-End 4D Surround',
          'MBUX Augmented Reality Head-Up Display',
          'Active Ambient Lighting (64 Colors)',
          'Chauffeur Package with Calf Massage'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 14,
        totalEarnings: 280000,
        maintenanceCost: 22000
      },
      {
        id: 'car_bmw_7',
        name: 'BMW 7 Series 740i',
        brand: 'BMW',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 21000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '12.2 km/l',
        power: '381 HP',
        acceleration: '5.4s (0-100)',
        topSpeed: '250 km/h',
        rating: 4.9,
        reviewsCount: 29,
        status: 'Available',
        featured: true,
        popular: false,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai & Bangalore Tech Corridor',
        description: 'Commanding luxury presence featuring the 31.3-inch 8K BMW Theatre Screen, Interaction Bar, and Executive Lounge seating.',
        features: [
          '31.3" 8K BMW Theatre Rear Screen',
          'Sky Lounge Panoramic LED Roof',
          'Bowers & Wilkins Diamond Surround',
          'Automatic Executive Comfort Doors'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 10,
        totalEarnings: 210000,
        maintenanceCost: 18000
      },
      {
        id: 'car_audi_rs7',
        name: 'Audi RS7 Sportback',
        brand: 'Audi',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 26000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '8.9 km/l',
        power: '591 HP',
        acceleration: '3.6s (0-100)',
        topSpeed: '305 km/h',
        rating: 5.0,
        reviewsCount: 22,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport (BOM) & Delhi NCR',
        description: 'Widebody super-sedan marrying 591 HP twin-turbo V8 muscle with 5-door sportback elegance and quattro sport differential.',
        features: [
          '4.0L Twin-Turbo 591 HP V8',
          'Quattro Sport Differential',
          'RS Sport Exhaust System',
          'HD Matrix LED with Audi Laser Light'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 8,
        totalEarnings: 208000,
        maintenanceCost: 24000
      },
      {
        id: 'car_porsche_taycan',
        name: 'Porsche Taycan Turbo S',
        brand: 'Porsche',
        type: 'Electric',
        year: 2024,
        pricePerDay: 24000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Electric',
        mileage: '450 km Range',
        power: '750 HP',
        acceleration: '2.8s (0-100)',
        topSpeed: '260 km/h',
        rating: 5.0,
        reviewsCount: 19,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Bangalore & Pune',
        description: 'Electrifying Porsche sports car dynamics with 800V charging architecture and mind-bending launch control acceleration.',
        features: [
          'Overboost 750 HP Launch Control',
          'Porsche Ceramic Composite Brakes (PCCB)',
          'Passenger Side Touch Display',
          'Porsche Electric Sport Sound'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 9,
        totalEarnings: 216000,
        maintenanceCost: 12000
      },
      {
        id: 'car_ferrari_f8',
        name: 'Ferrari F8 Tributo',
        brand: 'Ferrari',
        type: 'Sports',
        year: 2024,
        pricePerDay: 48000,
        seats: 2,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '6.5 km/l',
        power: '710 HP',
        acceleration: '2.9s (0-100)',
        topSpeed: '340 km/h',
        rating: 5.0,
        reviewsCount: 15,
        status: 'Available',
        featured: true,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai & Delhi VIP Lounges',
        description: 'Prancing horse perfection. 3.9-litre twin-turbo V8 producing 710 HP with race-derived S-Duct aerodynamics and Manettino switch.',
        features: [
          '3.9L Twin-Turbo 710 HP V8',
          'Ferrari Dynamic Enhancer (FDE+)',
          'Carbon-Fibre Racing Bucket Seats',
          'Manettino Drive Mode Selector'
        ],
        cancellationPolicy: 'Free cancellation up to 72 hours prior to journey.',
        totalBookings: 5,
        totalEarnings: 240000,
        maintenanceCost: 35000
      },
      {
        id: 'car_bentley_continental',
        name: 'Bentley Continental GT',
        brand: 'Bentley',
        type: 'Sports',
        year: 2024,
        pricePerDay: 42000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '8.2 km/l',
        power: '542 HP',
        acceleration: '4.0s (0-100)',
        topSpeed: '318 km/h',
        rating: 5.0,
        reviewsCount: 14,
        status: 'Available',
        featured: true,
        popular: false,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai & Delhi NCR Exclusive Hub',
        description: 'The definitive British Grand Tourer. Handcrafted diamond-in-diamond leather quilting, rotating dashboard display, and twin-turbo V8.',
        features: [
          'Bentley Rotating Dashboard Display',
          'Naim for Bentley 2,200W Audio',
          'Handcrafted Diamond Leather Interior',
          'Active All-Wheel Drive & Air Suspension'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 6,
        totalEarnings: 252000,
        maintenanceCost: 30000
      },
      {
        id: 'car_rolls_royce_ghost',
        name: 'Rolls-Royce Ghost',
        brand: 'Rolls-Royce',
        type: 'Sedan',
        year: 2024,
        pricePerDay: 65000,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '6.2 km/l',
        power: '563 HP',
        acceleration: '4.8s (0-100)',
        topSpeed: '250 km/h',
        rating: 5.0,
        reviewsCount: 11,
        status: 'Available',
        featured: true,
        popular: false,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai Airport VIP & Delhi NCR',
        description: 'The ultimate symbol of automotive transcendence. Planar Suspension system, Shooting Star Starlight headliner, and effortless 6.75L V12 power.',
        features: [
          '6.75L Twin-Turbo 563 HP V12',
          'Shooting Star Starlight Headliner',
          'Effortless Power-Assisted Coach Doors',
          'Planar World-Class Suspension System'
        ],
        cancellationPolicy: 'Free cancellation up to 72 hours prior to journey.',
        totalBookings: 4,
        totalEarnings: 260000,
        maintenanceCost: 45000
      },
      {
        id: 'car_aston_martin_db11',
        name: 'Aston Martin DB11 V8',
        brand: 'Aston Martin',
        type: 'Sports',
        year: 2024,
        pricePerDay: 38000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '9.0 km/l',
        power: '528 HP',
        acceleration: '4.0s (0-100)',
        topSpeed: '309 km/h',
        rating: 4.9,
        reviewsCount: 16,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Goa & Bangalore',
        description: 'Sculpted British grand tourer blending unmistakable Aston Martin proportions, twin-turbo V8 roar, and hand-stitched Bridge of Weir leather.',
        features: [
          'Twin-Turbo 528 HP V8 Powertrain',
          'Curlicue & Aeroblade Downforce Aero',
          'Bang & Olufsen BeoSound Audio',
          'Bridge of Weir Hand-Crafted Leather'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 6,
        totalEarnings: 228000,
        maintenanceCost: 26000
      },
      {
        id: 'car_land_rover_defender',
        name: 'Land Rover Defender 110',
        brand: 'Land Rover',
        type: 'SUV',
        year: 2024,
        pricePerDay: 13500,
        seats: 7,
        transmission: 'Automatic',
        fuel: 'Diesel',
        mileage: '11.5 km/l',
        power: '296 HP',
        acceleration: '7.0s (0-100)',
        topSpeed: '191 km/h',
        rating: 4.9,
        reviewsCount: 45,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: false,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai, Goa, Bangalore & Pune',
        description: 'Iconic 21st-century explorer. Electronic air suspension, 900mm water wading depth, 3D Surround Camera with ClearSight Ground View.',
        features: [
          'Electronic Air Suspension & Terrain Response 2',
          '900mm Water Wading Capability',
          '3D Surround Camera with ClearSight Ground View',
          'Meridian Sound System'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
        totalBookings: 18,
        totalEarnings: 243000,
        maintenanceCost: 12500
      },
      {
        id: 'car_lexus_lc500',
        name: 'Lexus LC 500 Coupe',
        brand: 'Lexus',
        type: 'Sports',
        year: 2024,
        pricePerDay: 25000,
        seats: 4,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '9.8 km/l',
        power: '471 HP',
        acceleration: '4.4s (0-100)',
        topSpeed: '270 km/h',
        rating: 5.0,
        reviewsCount: 17,
        status: 'Available',
        featured: false,
        popular: false,
        luxury: true,
        image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Mumbai & Bangalore Tech Corridor',
        description: 'Pure sensory masterpiece powered by a naturally-aspirated 5.0-litre V8, 10-speed Direct Shift transmission, and Takumi craftsmanship.',
        features: [
          'Naturally Aspirated 5.0L 471 HP V8',
          'Mark Levinson 13-Speaker Reference Audio',
          'Alcantara & Hand-Pleated Door Panels',
          'Active Rear Wing & Dynamic Handling'
        ],
        cancellationPolicy: 'Free cancellation up to 48 hours prior to journey.',
        totalBookings: 7,
        totalEarnings: 175000,
        maintenanceCost: 15000
      },
      {
        id: 'car_jeep_wrangler',
        name: 'Jeep Wrangler Rubicon',
        brand: 'Jeep',
        type: 'SUV',
        year: 2024,
        pricePerDay: 8500,
        seats: 5,
        transmission: 'Automatic',
        fuel: 'Petrol',
        mileage: '12.1 km/l',
        power: '268 HP',
        acceleration: '8.1s (0-100)',
        topSpeed: '180 km/h',
        rating: 4.8,
        reviewsCount: 38,
        status: 'Available',
        featured: false,
        popular: true,
        luxury: false,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&auto=format&fit=crop&q=80'
        ],
        location: 'Goa Airport (GOI), Pune & Mumbai',
        description: 'The ultimate trail-rated 4x4 with removable doors and roof, Rock-Trac heavy-duty 4WD system, and Tru-Lok front and rear locking differentials.',
        features: [
          'Rock-Trac Heavy-Duty 4WD System',
          'Tru-Lok Electronic Locking Differentials',
          'Removable Freedom Top Hardtop',
          'Alpine 9-Speaker All-Weather Audio'
        ],
        cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
        totalBookings: 22,
        totalEarnings: 187000,
        maintenanceCost: 9500
      }
    ];
    await write('cars', demoCars);
  }

  // 3. Seed Bookings
  const bookings = await read('bookings');
  if (bookings.length === 0) {
    const demoBookings = [
      {
        id: 'BK-1025',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        userPhone: '+91 98234 56789',
        carId: 'car_bmw_5',
        carName: 'BMW 5 Series',
        carBrand: 'BMW',
        carImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Mumbai Airport (BOM)',
        returnLocation: 'Mumbai Airport (BOM)',
        pickupDate: '2026-10-15',
        returnDate: '2026-10-18',
        pickupTime: '10:00 AM',
        returnTime: '06:00 PM',
        days: 3,
        basePrice: 24000,
        insurancePrice: 2400,
        addOns: [
          { name: 'Comprehensive Zero-Deductible Insurance', price: 2400 },
          { name: 'GPS Navigation System', price: 600 }
        ],
        addOnsPrice: 3000,
        couponCode: 'FIRST20',
        discount: 4800,
        tax: 3996,
        totalAmount: 26196,
        paymentStatus: 'Paid',
        paymentMethod: 'Credit Card',
        paymentId: 'PAY-89301',
        bookingStatus: 'Confirmed',
        createdAt: '2026-10-01T14:30:00.000Z'
      },
      {
        id: 'BK-1024',
        userId: 'usr_cust_02',
        userName: 'Priya Sharma',
        userEmail: 'priya.sharma@example.com',
        userPhone: '+91 98112 34567',
        carId: 'car_toyota_fortuner',
        carName: 'Toyota Fortuner Legender',
        carBrand: 'Toyota',
        carImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Indiranagar Hub, Bangalore',
        returnLocation: 'Bangalore Airport (BLR)',
        pickupDate: '2026-10-05',
        returnDate: '2026-10-09',
        pickupTime: '09:00 AM',
        returnTime: '08:00 PM',
        days: 4,
        basePrice: 30000,
        insurancePrice: 2000,
        addOns: [{ name: 'Child Safety Seat', price: 800 }],
        addOnsPrice: 2800,
        couponCode: 'DRIVE10',
        discount: 3000,
        tax: 5364,
        totalAmount: 35164,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
        paymentId: 'PAY-89244',
        bookingStatus: 'Active',
        createdAt: '2026-09-28T11:20:00.000Z'
      },
      {
        id: 'BK-1023',
        userId: 'usr_cust_03',
        userName: 'Rahul Verma',
        userEmail: 'rahul.verma@example.com',
        userPhone: '+91 98777 12345',
        carId: 'car_audi_a6',
        carName: 'Audi A6 Matrix',
        carBrand: 'Audi',
        carImage: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Connaught Place, New Delhi',
        returnLocation: 'Delhi Airport (DEL)',
        pickupDate: '2026-10-12',
        returnDate: '2026-10-14',
        pickupTime: '11:00 AM',
        returnTime: '07:00 PM',
        days: 2,
        basePrice: 16000,
        insurancePrice: 1600,
        addOns: [],
        addOnsPrice: 1600,
        couponCode: null,
        discount: 0,
        tax: 3168,
        totalAmount: 20768,
        paymentStatus: 'Pending',
        paymentMethod: null,
        paymentId: null,
        bookingStatus: 'Pending',
        createdAt: '2026-10-06T09:10:00.000Z'
      },
      {
        id: 'BK-1022',
        userId: 'usr_cust_04',
        userName: 'Sneha Patel',
        userEmail: 'sneha.patel@example.com',
        userPhone: '+91 98980 98980',
        carId: 'car_merc_c',
        carName: 'Mercedes C-Class',
        carBrand: 'Mercedes-Benz',
        carImage: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Ahmedabad Airport (AMD)',
        returnLocation: 'Ahmedabad Airport (AMD)',
        pickupDate: '2026-09-10',
        returnDate: '2026-09-12',
        pickupTime: '08:00 AM',
        returnTime: '08:00 PM',
        days: 2,
        basePrice: 13000,
        insurancePrice: 1200,
        addOns: [{ name: 'Airport Meet & Greet VIP', price: 1500 }],
        addOnsPrice: 2700,
        couponCode: 'WEEKEND15',
        discount: 1950,
        tax: 2475,
        totalAmount: 16225,
        paymentStatus: 'Paid',
        paymentMethod: 'Net Banking',
        paymentId: 'PAY-89190',
        bookingStatus: 'Completed',
        createdAt: '2026-09-01T15:40:00.000Z'
      },
      {
        id: 'BK-1021',
        userId: 'usr_cust_05',
        userName: 'Amit Singh',
        userEmail: 'amit.singh@example.com',
        userPhone: '+91 98222 33445',
        carId: 'car_range_rover_sport',
        carName: 'Range Rover Sport',
        carBrand: 'Range Rover',
        carImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Cyber Hub, Gurugram',
        returnLocation: 'Cyber Hub, Gurugram',
        pickupDate: '2026-08-20',
        returnDate: '2026-08-22',
        pickupTime: '10:00 AM',
        returnTime: '06:00 PM',
        days: 2,
        basePrice: 24000,
        insurancePrice: 2000,
        addOns: [],
        addOnsPrice: 2000,
        couponCode: null,
        discount: 0,
        tax: 4680,
        totalAmount: 30680,
        paymentStatus: 'Refunded',
        paymentMethod: 'Credit Card',
        paymentId: 'PAY-89055',
        bookingStatus: 'Cancelled',
        createdAt: '2026-08-15T18:00:00.000Z'
      },
      // Previous completed bookings for John Doe to match screenshot
      {
        id: 'BK-1019',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        carId: 'car_toyota_fortuner',
        carName: 'Toyota Fortuner Legender',
        carBrand: 'Toyota',
        carImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Mumbai Airport (BOM)',
        returnLocation: 'Mumbai Airport (BOM)',
        pickupDate: '2026-08-05',
        returnDate: '2026-08-08',
        pickupTime: '09:00 AM',
        returnTime: '07:00 PM',
        days: 3,
        basePrice: 22500,
        totalAmount: 18000,
        paymentStatus: 'Paid',
        paymentMethod: 'UPI',
        paymentId: 'PAY-88910',
        bookingStatus: 'Completed',
        createdAt: '2026-08-01T10:00:00.000Z'
      },
      {
        id: 'BK-1018',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        carId: 'car_audi_a6',
        carName: 'Audi A6 Matrix',
        carBrand: 'Audi',
        carImage: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Mumbai Central',
        returnLocation: 'Mumbai Airport (BOM)',
        pickupDate: '2026-07-12',
        returnDate: '2026-07-15',
        pickupTime: '10:00 AM',
        returnTime: '06:00 PM',
        days: 3,
        basePrice: 24000,
        totalAmount: 14200,
        paymentStatus: 'Paid',
        paymentMethod: 'Credit Card',
        paymentId: 'PAY-88750',
        bookingStatus: 'Completed',
        createdAt: '2026-07-08T12:00:00.000Z'
      },
      {
        id: 'BK-1017',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        carId: 'car_bmw_5',
        carName: 'BMW 5 Series',
        carBrand: 'BMW',
        carImage: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Mumbai Airport (BOM)',
        returnLocation: 'Mumbai Airport (BOM)',
        pickupDate: '2026-06-20',
        returnDate: '2026-06-23',
        pickupTime: '08:00 AM',
        returnTime: '08:00 PM',
        days: 3,
        basePrice: 24000,
        totalAmount: 12500,
        paymentStatus: 'Refunded',
        paymentMethod: 'Credit Card',
        paymentId: 'PAY-88612',
        bookingStatus: 'Cancelled',
        createdAt: '2026-06-15T11:00:00.000Z'
      },
      {
        id: 'BK-1016',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        carId: 'car_merc_c',
        carName: 'Mercedes C-Class',
        carBrand: 'Mercedes-Benz',
        carImage: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&auto=format&fit=crop&q=80',
        pickupLocation: 'Mumbai Downtown',
        returnLocation: 'Mumbai Airport (BOM)',
        pickupDate: '2026-05-10',
        returnDate: '2026-05-12',
        pickupTime: '09:00 AM',
        returnTime: '07:00 PM',
        days: 2,
        basePrice: 13000,
        totalAmount: 12500,
        paymentStatus: 'Paid',
        paymentMethod: 'Wallet',
        paymentId: 'PAY-88490',
        bookingStatus: 'Completed',
        createdAt: '2026-05-05T14:20:00.000Z'
      }
    ];
    await write('bookings', demoBookings);
  }

  // 4. Seed Payments
  const payments = await read('payments');
  if (payments.length === 0) {
    const demoPayments = [
      {
        id: 'PAY-89301',
        bookingId: 'BK-1025',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        carName: 'BMW 5 Series',
        amount: 26196,
        method: 'Credit Card',
        cardLast4: '4242',
        status: 'Paid',
        date: '2026-10-01T14:32:10.000Z'
      },
      {
        id: 'PAY-89244',
        bookingId: 'BK-1024',
        userId: 'usr_cust_02',
        userName: 'Priya Sharma',
        carName: 'Toyota Fortuner Legender',
        amount: 35164,
        method: 'UPI',
        upiId: 'priya@okhdfcbank',
        status: 'Paid',
        date: '2026-09-28T11:21:45.000Z'
      },
      {
        id: 'PAY-89190',
        bookingId: 'BK-1022',
        userId: 'usr_cust_04',
        userName: 'Sneha Patel',
        carName: 'Mercedes C-Class',
        amount: 16225,
        method: 'Net Banking',
        bankName: 'HDFC Bank',
        status: 'Paid',
        date: '2026-09-01T15:42:00.000Z'
      },
      {
        id: 'PAY-89055',
        bookingId: 'BK-1021',
        userId: 'usr_cust_05',
        userName: 'Amit Singh',
        carName: 'Range Rover Sport',
        amount: 30680,
        method: 'Credit Card',
        cardLast4: '8821',
        status: 'Refunded',
        refundDate: '2026-08-16T10:00:00.000Z',
        date: '2026-08-15T18:02:15.000Z'
      },
      {
        id: 'PAY-88910',
        bookingId: 'BK-1019',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        carName: 'Toyota Fortuner Legender',
        amount: 18000,
        method: 'UPI',
        status: 'Paid',
        date: '2026-08-01T10:05:00.000Z'
      },
      {
        id: 'PAY-88750',
        bookingId: 'BK-1018',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        carName: 'Audi A6 Matrix',
        amount: 14200,
        method: 'Credit Card',
        cardLast4: '4242',
        status: 'Paid',
        date: '2026-07-08T12:05:00.000Z'
      },
      {
        id: 'PAY-88612',
        bookingId: 'BK-1017',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        carName: 'BMW 5 Series',
        amount: 12500,
        method: 'Credit Card',
        cardLast4: '4242',
        status: 'Refunded',
        refundDate: '2026-06-16T09:00:00.000Z',
        date: '2026-06-15T11:05:00.000Z'
      },
      {
        id: 'PAY-88490',
        bookingId: 'BK-1016',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        carName: 'Mercedes C-Class',
        amount: 12500,
        method: 'Wallet',
        status: 'Paid',
        date: '2026-05-05T14:22:00.000Z'
      }
    ];
    await write('payments', demoPayments);
  }

  // 5. Seed Favourites
  const favourites = await read('favourites');
  if (favourites.length === 0) {
    const demoFavourites = [
      { id: 'fav_1', userId: 'usr_cust_01', carId: 'car_bmw_5', createdAt: '2026-09-10T10:00:00.000Z' },
      { id: 'fav_2', userId: 'usr_cust_01', carId: 'car_toyota_fortuner', createdAt: '2026-09-12T11:00:00.000Z' },
      { id: 'fav_3', userId: 'usr_cust_01', carId: 'car_audi_a6', createdAt: '2026-09-15T14:00:00.000Z' },
      { id: 'fav_4', userId: 'usr_cust_01', carId: 'car_range_rover_sport', createdAt: '2026-09-20T16:00:00.000Z' }
    ];
    await write('favourites', demoFavourites);
  }

  // 6. Seed Reviews
  const reviews = await read('reviews');
  if (reviews.length === 0) {
    const demoReviews = [
      {
        id: 'rev_1',
        carId: 'car_bmw_5',
        carName: 'BMW 5 Series',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Supreme driving comfort and effortless power!',
        comment: 'Rented this 5 Series for a weekend getaway to Lonavala. The car was pristine, smelling fresh with spotless interiors. Seamless pickup and return process at Mumbai Airport. Highly recommend DriveEase!',
        status: 'Approved',
        createdAt: '2026-08-10T18:30:00.000Z'
      },
      {
        id: 'rev_2',
        carId: 'car_toyota_fortuner',
        carName: 'Toyota Fortuner Legender',
        userId: 'usr_cust_02',
        userName: 'Priya Sharma',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Unstoppable beast on Western Ghats!',
        comment: 'Took the Fortuner for our family trip across Karnataka. Exceptional 4x4 capability, massive boot space, and 7 super comfortable seats. DriveEase customer support was 10/10.',
        status: 'Approved',
        createdAt: '2026-08-15T12:00:00.000Z'
      },
      {
        id: 'rev_3',
        carId: 'car_merc_c',
        carName: 'Mercedes C-Class',
        userId: 'usr_cust_04',
        userName: 'Sneha Patel',
        userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Pure executive luxury for my client meetings',
        comment: 'Smooth ride, elegant interiors, and stellar ambient lighting at night. The digital cockpit was a delight to use. Will definitely rent again.',
        status: 'Approved',
        createdAt: '2026-09-14T16:00:00.000Z'
      },
      {
        id: 'rev_4',
        carId: 'car_audi_a6',
        carName: 'Audi A6 Matrix',
        userId: 'usr_cust_03',
        userName: 'Rahul Verma',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        rating: 4,
        title: 'Fantastic tech and smooth ride quality',
        comment: 'The virtual cockpit is futuristic and the sound insulation is top-notch. Pickup was fast and the car was fully sanitized.',
        status: 'Approved',
        createdAt: '2026-07-20T10:00:00.000Z'
      },
      {
        id: 'rev_5',
        carId: 'car_range_rover_sport',
        carName: 'Range Rover Sport',
        userId: 'usr_cust_05',
        userName: 'Amit Singh',
        userAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Unrivalled road presence and supreme air suspension',
        comment: 'Drove the Range Rover Sport to Goa. The dynamic air suspension glides over road undulations effortlessly. Exceptional service.',
        status: 'Approved',
        createdAt: '2026-09-02T11:00:00.000Z'
      },
      {
        id: 'rev_6',
        carId: 'car_merc_g63',
        carName: 'Mercedes-AMG G 63',
        userId: 'usr_cust_01',
        userName: 'John Doe',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Monstrous acceleration and unmatched luxury',
        comment: 'The G63 AMG exhaust note is unforgettable. Imposing presence and exceptional service by the DriveEase concierge team.',
        status: 'Approved',
        createdAt: '2026-09-28T15:00:00.000Z'
      },
      {
        id: 'rev_7',
        carId: 'car_porsche_911',
        carName: 'Porsche 911 Carrera',
        userId: 'usr_cust_03',
        userName: 'Rahul Verma',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Pure driving nirvana and surgical handling',
        comment: 'The rear-engine PDK gearbox is pure perfection. Pristine car condition upon airport delivery.',
        status: 'Approved',
        createdAt: '2026-09-22T08:30:00.000Z'
      },
      {
        id: 'rev_8',
        carId: 'car_lambo_urus',
        carName: 'Lamborghini Urus S',
        userId: 'usr_cust_05',
        userName: 'Amit Singh',
        userAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        rating: 5,
        title: 'Astonishing supercar performance with SUV practicality',
        comment: 'The 657 HP twin-turbo V8 launch control is mind-blowing. Effortless airport handover at Mumbai T2.',
        status: 'Approved',
        createdAt: '2026-10-02T14:00:00.000Z'
      }
    ];
    await write('reviews', demoReviews);
  }

  // 7. Seed Coupons
  const coupons = await read('coupons');
  if (coupons.length === 0) {
    const demoCoupons = [
      {
        id: 'cpn_1',
        code: 'WEEKEND20',
        discountPercent: 20,
        maxDiscount: 8000,
        minAmount: 10000,
        description: 'Get Up to 20% Off on Weekend Rentals',
        validUntil: '2027-12-31',
        usageLimit: 500,
        usageCount: 142,
        active: true
      },
      {
        id: 'cpn_2',
        code: 'FIRST20',
        discountPercent: 20,
        maxDiscount: 6000,
        minAmount: 8000,
        description: '20% Flat Discount for First Time Users',
        validUntil: '2027-12-31',
        usageLimit: 1000,
        usageCount: 384,
        active: true
      },
      {
        id: 'cpn_3',
        code: 'DRIVE10',
        discountPercent: 10,
        maxDiscount: 3000,
        minAmount: 5000,
        description: '10% Instant Discount on Any Car',
        validUntil: '2027-12-31',
        usageLimit: 2000,
        usageCount: 890,
        active: true
      },
      {
        id: 'cpn_4',
        code: 'WEEKEND15',
        discountPercent: 15,
        maxDiscount: 4000,
        minAmount: 8000,
        description: '15% Off on Friday to Sunday Bookings',
        validUntil: '2027-12-31',
        usageLimit: 400,
        usageCount: 95,
        active: true
      }
    ];
    await write('coupons', demoCoupons);
  }

  // 8. Seed Expenses
  const expenses = await read('expenses');
  if (expenses.length === 0) {
    const demoExpenses = [
      { id: 'exp_1', title: 'Fleet Periodic Servicing & Oil Change', category: 'Maintenance', amount: 45000, carId: 'car_bmw_5', date: '2026-09-15' },
      { id: 'exp_2', title: 'Comprehensive Commercial Insurance Fleet Renewal', category: 'Insurance', amount: 55000, carId: null, date: '2026-09-10' },
      { id: 'exp_3', title: 'Deep Interior Detailing & Ceramic Coating', category: 'Cleaning', amount: 15000, carId: 'car_merc_g63', date: '2026-09-20' },
      { id: 'exp_4', title: 'Airport Chauffeur & Logistics Support', category: 'Operational', amount: 10000, carId: null, date: '2026-09-25' }
    ];
    await write('expenses', demoExpenses);
  }

  // 9. Seed Activities
  const activities = await read('activities');
  if (activities.length === 0) {
    const demoActivities = [
      {
        id: 'act_1',
        type: 'user_register',
        user: 'john.doe@example.com',
        userName: 'John Doe',
        action: 'New user registered',
        description: 'john.doe@example.com created a new account',
        icon: 'user-plus',
        time: '10:42 PM',
        createdAt: '2026-10-07T22:42:00.000Z'
      },
      {
        id: 'act_2',
        type: 'booking_confirmed',
        user: 'john.doe@example.com',
        userName: 'John Doe',
        action: 'Car booking confirmed',
        description: 'BMW 5 Series • #BK-1025',
        icon: 'calendar-check',
        time: '10:38 PM',
        createdAt: '2026-10-07T22:38:00.000Z'
      },
      {
        id: 'act_3',
        type: 'payment_received',
        user: 'john.doe@example.com',
        userName: 'John Doe',
        action: 'Payment received',
        description: '₹26,196 via Credit Card',
        icon: 'credit-card',
        time: '10:35 PM',
        createdAt: '2026-10-07T22:35:00.000Z'
      },
      {
        id: 'act_4',
        type: 'car_added',
        user: 'admin@driveease.com',
        userName: 'Admin',
        action: 'Car added to fleet',
        description: 'Range Rover Sport updated in active fleet',
        icon: 'truck',
        time: '10:21 PM',
        createdAt: '2026-10-07T22:21:00.000Z'
      },
      {
        id: 'act_5',
        type: 'booking_cancelled',
        user: 'amit.singh@example.com',
        userName: 'Amit Singh',
        action: 'Booking cancelled & refunded',
        description: 'Range Rover Sport • #BK-1021',
        icon: 'x-circle',
        time: '09:52 PM',
        createdAt: '2026-10-07T21:52:00.000Z'
      },
      {
        id: 'act_6',
        type: 'car_favourited',
        user: 'john.doe@example.com',
        userName: 'John Doe',
        action: 'Added car to favourites',
        description: 'Added BMW 5 Series to favourites',
        icon: 'heart',
        time: '4 hours ago',
        createdAt: '2026-10-07T18:30:00.000Z'
      },
      {
        id: 'act_7',
        type: 'car_viewed',
        user: 'john.doe@example.com',
        userName: 'John Doe',
        action: 'Viewed car details',
        description: 'Viewed Audi A6 Matrix',
        icon: 'eye',
        time: '2 hours ago',
        createdAt: '2026-10-07T20:30:00.000Z'
      }
    ];
    await write('activities', demoActivities);
  }

  // 10. Seed Notifications
  const notifications = await read('notifications');
  if (notifications.length === 0) {
    const demoNotifications = [
      {
        id: 'notif_1',
        userId: 'usr_cust_01',
        title: 'Booking Confirmed!',
        message: 'Your booking #BK-1025 for BMW 5 Series has been confirmed for Aug 15 - Aug 18.',
        type: 'booking',
        read: false,
        createdAt: '2026-10-01T14:35:00.000Z'
      },
      {
        id: 'notif_2',
        userId: 'usr_cust_01',
        title: 'Payment Successful',
        message: 'We received your payment of ₹26,196 for Booking #BK-1025. Receipt is ready to download.',
        type: 'payment',
        read: false,
        createdAt: '2026-10-01T14:32:00.000Z'
      },
      {
        id: 'notif_3',
        userId: 'usr_cust_01',
        title: 'Exclusive Weekend Offer 🔥',
        message: 'Get 20% flat discount on all luxury sedans this weekend with code WEEKEND20.',
        type: 'promo',
        read: false,
        createdAt: '2026-10-05T09:00:00.000Z'
      },
      {
        id: 'notif_4',
        userId: 'usr_admin_01',
        title: 'New Booking Received',
        message: 'John Doe booked BMW 5 Series (BK-1025) for ₹26,196.',
        type: 'admin',
        read: false,
        createdAt: '2026-10-01T14:35:00.000Z'
      },
      {
        id: 'notif_5',
        userId: 'usr_admin_01',
        title: 'Scheduled Maintenance Due',
        message: 'Toyota Fortuner is scheduled for 10,000km routine service.',
        type: 'admin',
        read: false,
        createdAt: '2026-10-06T11:00:00.000Z'
      }
    ];
    await write('notifications', demoNotifications);
  }
}

module.exports = {
  read,
  write,
  find,
  findOne,
  insert,
  update,
  updateById,
  remove,
  removeById,
  seedInitialData
};
