const mongoose = require('mongoose');

module.exports = mongoose.model('SolarPlant', new mongoose.Schema({
  plantId: { type: String, required: true, unique: true },
  plantName: { type: String, required: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  location: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, min: 0 },
  numberOfPanels: { type: Number, required: true, min: 1 },
  installationDate: { type: String, required: true },
  status: { type: String, enum: ['Operational', 'Under Maintenance', 'Inactive'], default: 'Operational' }
}, { timestamps: true }));