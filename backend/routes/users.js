const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const User = require('../models/User');
const SolarPlant = require('../models/SolarPlant');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const escapeRegex = require('../utils/regex');

router.use(protect, restrictTo('admin'));

const PHONE = /^[6-9]\d{9}$/;
const strong = (chain) =>
  chain
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter.')
    .matches(/\d/).withMessage('Password must contain a number.');

const base = (opt) => {
  const f = (n) => (opt ? body(n).optional() : body(n));
  return [
    f('name').trim().isLength({ min: 3, max: 80 }).withMessage('Enter the full name.'),
    f('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
    f('phone').trim().matches(PHONE).withMessage('Enter a valid 10-digit mobile number.'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive.')
  ];
};
const idRule = param('id').isMongoId().withMessage('Invalid user ID.');

/* GET /api/users?q=  (plant owners only, with their plants) */
router.get('/', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = { role: 'user' };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  const plants = await SolarPlant.find({ userId: { $in: users.map((u) => u._id) } }).select('plantId plantName userId').lean();
  res.json(users.map(({ __v, ...u }) => ({
    ...u,
    plants: plants.filter((p) => String(p.userId) === String(u._id)).map((p) => ({ plantId: p.plantId, plantName: p.plantName }))
  })));
}));

router.get('/:id', [idRule], validate, wrap(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const plants = await SolarPlant.find({ userId: user._id }).select('plantId plantName status');
  res.json({ ...user.toJSON(), plants });
}));

router.post('/', [...base(false), strong(body('password'))], validate, wrap(async (req, res) => {
  const { name, email, phone, password, status } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ message: 'This email is already registered.' });
  const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 12), role: 'user', status });
  res.status(201).json(user);
}));

router.put('/:id', [idRule, ...base(true), strong(body('password').optional({ values: 'falsy' }))], validate, wrap(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  const { name, email, phone, password, status } = req.body;
  if (email && email !== user.email && (await User.findOne({ email }))) {
    return res.status(409).json({ message: 'This email is already registered.' });
  }
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (status) user.status = status;
  if (password) user.password = await bcrypt.hash(password, 12);
  await user.save();
  res.json(user);
}));

router.delete('/:id', [idRule], validate, wrap(async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, role: 'user' });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  // Their plants become unassigned; maintenance and order history is kept for records
  await Promise.all([
    SolarPlant.updateMany({ userId: user._id }, { userId: null }),
    Notification.deleteMany({ userId: user._id }),
    Report.deleteMany({ userId: user._id })
  ]);
  res.json({ message: 'User deleted.' });
}));

module.exports = router;