require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const SolarPlant = require('./models/SolarPlant');
const EnergyRecord = require('./models/EnergyRecord');
const MaintenanceRequest = require('./models/MaintenanceRequest');
const Notification = require('./models/Notification');
const Order = require('./models/Order');
const Report = require('./models/Report');
const Product = require('./models/Product');
const { Counter } = require('./utils/nextId');
const { simulateRecords, addDays } = require('./utils/solar');

const PRODUCTS = [
  ['Mono PERC Solar Panel 540W', 'Solar Panels', 14500, 'panel', 'High-efficiency monocrystalline panel for rooftop plants.', ['540 W rated power', 'Anti-reflective glass', 'Suitable for homes and offices'], 'In stock'],
  ['Polycrystalline Panel 330W', 'Solar Panels', 8900, 'panel', 'Budget-friendly panel for small installations.', ['330 W rated power', 'Durable aluminium frame', 'Good for small rooftops'], 'In stock'],
  ['Bifacial Solar Panel 580W', 'Solar Panels', 17800, 'panel', 'Captures light on both sides for extra generation.', ['580 W rated power', 'Dual-side generation', 'Best for open mounting'], 'Made to order'],
  ['On-Grid Inverter 5 kW', 'Inverters', 42000, 'unit', 'Converts panel output to grid-ready power.', ['5 kW capacity', 'Wi-Fi monitoring ready', 'Built-in protections'], 'In stock'],
  ['Hybrid Inverter 5 kW', 'Inverters', 78000, 'unit', 'Works with battery storage and the grid.', ['5 kW capacity', 'Battery compatible', 'Backup power output'], 'Made to order'],
  ['Lithium Battery 5 kWh', 'Batteries', 105000, 'unit', 'Stores surplus energy for evening and outages.', ['5 kWh storage', 'Long cycle life', 'Wall-mount design'], 'Made to order'],
  ['Smart Energy Meter', 'Monitoring', 4500, 'unit', 'Measures generation and consumption accurately.', ['Single and three phase', 'Digital display', 'Data logging support'], 'In stock'],
  ['Wi-Fi Monitoring Dongle', 'Monitoring', 3800, 'unit', 'Connects your inverter to the SolarSense platform.', ['Plug-and-play setup', 'Works with common inverters', 'Future IoT integration'], 'In stock'],
  ['Mounting Structure Kit (per kW)', 'Accessories', 6000, 'kit', 'Galvanised rooftop mounting structure.', ['Corrosion resistant', 'Adjustable tilt', 'Includes fasteners'], 'In stock'],
  ['DC Cable and Connector Kit', 'Accessories', 3200, 'kit', 'UV-resistant solar cable with MC4 connectors.', ['Solar-grade copper cable', 'Weatherproof connectors', 'Standard 20 m length'], 'In stock'],
  ['Panel Cleaning Kit', 'Accessories', 2400, 'kit', 'Soft brush and extension pole for safe cleaning.', ['Non-abrasive brush', 'Telescopic pole', 'Keeps output high'], 'In stock'],
  ['Surge Protection Box (ACDB/DCDB)', 'Accessories', 5500, 'unit', 'Protects your system from surges and faults.', ['Combined AC and DC protection', 'Weatherproof enclosure', 'Easy installation'], 'In stock']
];

(async () => {
  await connectDB();
  await Promise.all([User, SolarPlant, EnergyRecord, MaintenanceRequest, Notification, Order, Report, Product, Counter].map((m) => m.deleteMany({})));

  // Demo accounts (demo passwords only; use real ones in production)
  const [adminPw, userPw] = await Promise.all([bcrypt.hash('Admin@123', 12), bcrypt.hash('User@123', 12)]);
  const [admin, owner] = await User.insertMany([
    { name: 'Admin', email: 'admin@solarsense.com', phone: '9000000001', password: adminPw, role: 'admin' },
    { name: 'Demo Owner', email: 'user@solarsense.com', phone: '9000000002', password: userPw, role: 'user' }
  ]);

  const plants = await SolarPlant.insertMany([
    { plantId: 'SP-1001', plantName: 'Sunrise Residency Plant', userId: owner._id, location: 'Pune, Maharashtra', capacity: 6, numberOfPanels: 12, installationDate: '2025-03-15', status: 'Operational' },
    { plantId: 'SP-1002', plantName: 'Green Valley School', userId: null, location: 'Nashik, Maharashtra', capacity: 15, numberOfPanels: 30, installationDate: '2025-06-10', status: 'Operational' },
    { plantId: 'SP-1003', plantName: 'Hillview Apartments', userId: null, location: 'Aurangabad, Maharashtra', capacity: 10, numberOfPanels: 20, installationDate: '2025-08-01', status: 'Operational' },
    { plantId: 'SP-1004', plantName: 'City Mart Rooftop', userId: null, location: 'Nagpur, Maharashtra', capacity: 8, numberOfPanels: 16, installationDate: '2026-01-20', status: 'Under Maintenance' }
  ]);

  // Simulated daily energy, with two planted faults so the demo has something to detect
  const faults = { 'SP-1001': { 1: 0.58, 9: 0.7 }, 'SP-1003': { 2: 0.45 } };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const records = [];
  for (const p of plants) {
    for (const r of simulateRecords(p.plantId, p.capacity, p.installationDate)) {
      const ago = Math.round((today - new Date(r.date + 'T00:00:00')) / 864e5);
      const f = faults[p.plantId] && faults[p.plantId][ago];
      if (f) r.energyGenerated = +(r.expectedEnergy * f).toFixed(1);
      records.push(r);
    }
  }
  await EnergyRecord.insertMany(records);

  await Product.insertMany(PRODUCTS.map(([name, category, price, unit, description, specs, stock], i) => ({
    productId: 'PR-' + (1001 + i), name, category, price, unit, description, specs, stock
  })));

  await MaintenanceRequest.insertMany([
    { requestId: 'MR-1001', userId: owner._id, plantId: 'SP-1001', title: 'Routine inspection', description: 'Six-month inspection.', priority: 'Low', status: 'Closed', assignedTechnician: 'Ravi Patil', createdAt: addDays(new Date(), -60), resolvedAt: addDays(new Date(), -55) },
    { requestId: 'MR-1002', userId: owner._id, plantId: 'SP-1001', title: 'Inverter error code E21', description: 'Inverter shows intermittent error.', priority: 'High', status: 'Resolved', assignedTechnician: 'Sneha Kulkarni', createdAt: addDays(new Date(), -18), resolvedAt: addDays(new Date(), -15) },
    { requestId: 'MR-1003', userId: owner._id, plantId: 'SP-1001', title: 'Panel cleaning needed', description: 'Output dropped after dust storm.', priority: 'Medium', status: 'In Progress', assignedTechnician: 'Ravi Patil', createdAt: addDays(new Date(), -1) }
  ]);

  await Notification.insertMany([
    { userId: admin._id, title: 'Critical fault', message: 'Plant SP-1003 output is far below expected.', type: 'fault' },
    { userId: owner._id, title: 'Maintenance update', message: 'MR-1003 is now In Progress.', type: 'maintenance' }
  ]);

  console.log('Seeded: 2 users, ' + plants.length + ' plants, ' + records.length + ' energy records, ' + PRODUCTS.length + ' products, 3 maintenance requests.');
  await mongoose.disconnect();
  process.exit(0);
})();