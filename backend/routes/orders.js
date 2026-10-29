const router = require('express').Router();
const { body, param } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const nextId = require('../utils/nextId');
const { notify, notifyAdmins } = require('../utils/notify');

router.use(protect);

const FLOW = { Placed: ['Confirmed', 'Cancelled'], Confirmed: ['Dispatched', 'Cancelled'], Dispatched: ['Delivered', 'Cancelled'], Delivered: [], Cancelled: [] };
const PAY_METHODS = ['Cash on Delivery', 'UPI', 'Bank Transfer', 'Card on Delivery'];
const codeRule = param('orderId').matches(/^ORD-\d+$/).withMessage('Invalid order ID.');

router.get('/', wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  res.json(await Order.find(filter).sort({ createdAt: -1 }).populate('userId', 'name email phone').lean());
}));

/* User: place an order request. Send only product IDs and quantities. */
router.post('/', restrictTo('user'), [
  body('items').isArray({ min: 1, max: 30 }).withMessage('Your cart is empty.'),
  body('items.*.productId').isString().trim().notEmpty().withMessage('Invalid product.'),
  body('items.*.qty').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100.').toInt(),
  body('address').trim().isLength({ min: 10, max: 300 }).withMessage('Enter your full delivery address.'),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number.'),
  body('notes').optional().trim().isLength({ max: 300 }),
  body('paymentMethod').isIn(PAY_METHODS).withMessage('Choose a payment method.')
], validate, wrap(async (req, res) => {
  const qty = new Map();
  req.body.items.forEach((i) => qty.set(i.productId, (qty.get(i.productId) || 0) + i.qty));
  const products = await Product.find({ productId: { $in: [...qty.keys()] } });
  if (products.length !== qty.size) return res.status(400).json({ message: 'One or more products no longer exist.' });
  const out = products.find((p) => p.stock === 'Out of stock');
  if (out) return res.status(400).json({ message: out.name + ' is out of stock.' });

  const items = products.map((p) => ({ productId: p.productId, name: p.name, price: p.price, qty: qty.get(p.productId) }));
  const order = await Order.create({
    orderId: await nextId('ORD', Order, 'orderId', 1001),
    userId: req.user._id, items,
    total: items.reduce((a, i) => a + i.price * i.qty, 0),
    address: req.body.address, phone: req.body.phone, notes: req.body.notes || '',
    paymentMethod: req.body.paymentMethod, paymentStatus: 'Pending'
  });
  await notifyAdmins('New order request', order.orderId + ' from ' + req.user.name, 'order');
  res.status(201).json(order);
}));

/* User: cancel while still Placed */
router.put('/:orderId/cancel', restrictTo('user'), [codeRule], validate, wrap(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.status !== 'Placed') return res.status(400).json({ message: 'Only orders that are still Placed can be cancelled.' });
  order.status = 'Cancelled';
  await order.save();
  await notifyAdmins('Order cancelled', order.orderId + ' was cancelled by ' + req.user.name, 'order');
  res.json(order);
}));

/* Admin: move an order forward (Placed > Confirmed > Dispatched > Delivered) or cancel it */
router.put('/:orderId/status', restrictTo('admin'), [
  codeRule,
  body('status').isIn(['Confirmed', 'Dispatched', 'Delivered', 'Cancelled']).withMessage('Choose a valid status.')
], validate, wrap(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (!FLOW[order.status].includes(req.body.status)) {
    return res.status(400).json({ message: 'An order cannot move from ' + order.status + ' to ' + req.body.status + '.' });
  }
  order.status = req.body.status;
  await order.save();
  await notify(order.userId, 'Order update', order.orderId + ' is now ' + order.status + '.', 'order');
  res.json(await order.populate('userId', 'name email phone'));
}));

/* Admin: record that the payment was received (or set it back to Pending) */
router.put('/:orderId/payment', restrictTo('admin'), [
  codeRule,
  body('paymentStatus').isIn(['Pending', 'Paid']).withMessage('Choose a valid payment status.')
], validate, wrap(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.status === 'Cancelled') return res.status(400).json({ message: 'This order was cancelled.' });
  order.paymentStatus = req.body.paymentStatus;
  order.paidAt = req.body.paymentStatus === 'Paid' ? new Date() : null;
  await order.save();
  if (order.paymentStatus === 'Paid') {
    await notify(order.userId, 'Payment received', 'Payment for ' + order.orderId + ' (' + order.paymentMethod + ') has been recorded as received.', 'order');
  }
  res.json(await order.populate('userId', 'name email phone'));
}));

module.exports = router;