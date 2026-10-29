const mongoose = require('mongoose');

module.exports = mongoose.model('Report', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantId: { type: String, default: '' },
  reportType: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  options: { type: Object, default: {} },
  generatedAt: { type: Date, default: Date.now }
}));