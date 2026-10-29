const mongoose = require('mongoose');

module.exports = mongoose.model('Technician', new mongoose.Schema({
  technicianId: { type: String, required: true, unique: true }, // e.g. TC-1001
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  specialization: { type: String, default: 'General maintenance', trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true }));