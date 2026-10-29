const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  plantId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  energyGenerated: { type: Number, required: true, min: 0 },
  expectedEnergy: { type: Number, required: true, min: 0 }
});
schema.index({ plantId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('EnergyRecord', schema);