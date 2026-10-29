const mongoose = require('mongoose');

module.exports = mongoose.model('MaintenanceRequest', new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'], default: 'Pending' },
  assignedTechnician: { type: String, default: '' },   // technician name (kept so old pages keep working)
  technicianId: { type: String, default: '' },         // e.g. TC-1001
  technicianPhone: { type: String, default: '' },      // shown to the user once assigned
  serviceNotes: [{ text: String, date: { type: Date, default: Date.now } }],
  resolvedAt: { type: Date, default: null }
}, { timestamps: true }));