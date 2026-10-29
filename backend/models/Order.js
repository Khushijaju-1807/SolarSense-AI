const mongoose = require('mongoose');

module.exports = mongoose.model('Order', new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ productId: String, name: String, price: Number, qty: Number }],
  total: { type: Number, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  notes: { type: String, default: '' },
  // Payment is only recorded (no online payment gateway)
  paymentMethod: { type: String, enum: ['Cash on Delivery', 'UPI', 'Bank Transfer', 'Card on Delivery'], default: 'Cash on Delivery' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paidAt: { type: Date, default: null },
  status: { type: String, enum: ['Placed', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'], default: 'Placed' }
}, { timestamps: true }));