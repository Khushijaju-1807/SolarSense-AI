const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const { protect } = require('../middleware/auth');

const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '1d' });

const strongPassword = (field) =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter.')
    .matches(/\d/).withMessage('Password must contain a number.');

const nameRule = body('name').trim().isLength({ min: 3 }).withMessage('Enter your full name.');
const phoneRule = body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number.');

/* POST /api/auth/register */
router.post(
  '/register',
  [
    nameRule,
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
    phoneRule,
    strongPassword('password'),
    body('confirmPassword').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match.')
  ],
  validate,
  wrap(async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'This email is already registered. Try signing in.' });
    }
    // role is never read from the request: every public registration is a normal user
    const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: sign(user), user });
  })
);

/* POST /api/auth/login */
router.post(
  '/login',
  [
    body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
    body('password').notEmpty().withMessage('Enter your password.')
  ],
  validate,
  wrap(async (req, res) => {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email }).select('+password');
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ message: 'Email or password is incorrect.' });

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Your account is deactivated. Contact the administrator.' });
    }
    if (role && role !== user.role) {
      return res.status(403).json({
        message: 'This is not ' + (role === 'admin' ? 'an admin' : 'a user') + ' account. Switch the tab above.'
      });
    }
    res.json({ token: sign(user), user });
  })
);

/* GET /api/auth/me */
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

/* PUT /api/auth/me  (update own name and phone) */
router.put('/me', protect, [nameRule, phoneRule], validate, wrap(async (req, res) => {
  req.user.name = req.body.name;
  req.user.phone = req.body.phone;
  await req.user.save();
  res.json({ user: req.user });
}));

/* PUT /api/auth/password */
router.put(
  '/password',
  protect,
  [body('currentPassword').notEmpty().withMessage('Enter your current password.'), strongPassword('newPassword')],
  validate,
  wrap(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    if (req.body.currentPassword === req.body.newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one.' });
    }
    user.password = await bcrypt.hash(req.body.newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated.' });
  })
);

module.exports = router;
