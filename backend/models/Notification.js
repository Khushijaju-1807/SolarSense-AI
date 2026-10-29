const mongoose = require('mongoose');

module.exports = mongoose.model('Notification', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'maintenance' },
  isRead: { type: Boolean, default: false }
}, { timestamps: { createdAt: true, updatedAt: false } }));