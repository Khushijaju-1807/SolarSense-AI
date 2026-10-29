/* Run ONCE:  node addTechnicians.js
   Adds two sample technicians and links the existing maintenance requests to them.
   It does not delete anything. */
require('dotenv').config();
const mongoose = require('mongoose');
const Technician = require('./models/Technician');
const MaintenanceRequest = require('./models/MaintenanceRequest');
const nextId = require('./utils/nextId');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const sample = [
    { name: 'Ravi Patil', phone: '9876501234', email: 'ravi.patil@solarsense.com', specialization: 'Inverters & wiring' },
    { name: 'Sneha Kulkarni', phone: '9876505678', email: 'sneha.k@solarsense.com', specialization: 'Panel cleaning & inspection' }
  ];
  for (const s of sample) {
    let t = await Technician.findOne({ name: s.name });
    if (!t) t = await Technician.create({ ...s, technicianId: await nextId('TC', Technician, 'technicianId', 1001) });
    const r = await MaintenanceRequest.updateMany(
      { assignedTechnician: t.name, technicianId: { $in: ['', null] } },
      { technicianId: t.technicianId, technicianPhone: t.phone });
    console.log(t.technicianId, t.name, t.phone, '- linked requests:', r.modifiedCount);
  }
  console.log('Technicians in database:', await Technician.countDocuments());
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });