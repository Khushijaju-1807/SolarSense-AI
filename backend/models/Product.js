const mongoose = require('mongoose');

module.exports = mongoose.model('Product', new mongoose.Schema({
  productId: { type: String, required: true, unique: true }, // e.g. PR-1001
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'unit', trim: true },
  description: { type: String, default: '', trim: true },
  specs: [String],
  stock: { type: String, enum: ['In stock', 'Made to order', 'Out of stock'], default: 'In stock' },
  img: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } }));