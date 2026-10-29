const router = require('express').Router();
const { body } = require('express-validator');
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');

router.use(protect);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', wrap(async (req, res) => {
  res.json(await Report.find({ userId: req.user._id }).sort({ generatedAt: -1 }).limit(50).lean());
}));

router.post('/', [
  body('reportType').trim().isIn(['monthly', 'yearly', 'plant', 'user', 'energy', 'maintenance']).withMessage('Invalid report type.'),
  body('plantId').optional({ values: 'falsy' }).matches(/^SP-\d+$/),
  body('startDate').matches(DATE).withMessage('Invalid start date.'),
  body('endDate').matches(DATE).withMessage('Invalid end date.')
    .custom((v, { req }) => { if (v < req.body.startDate) throw new Error('End date must not be before the start date.'); return true; }),
  body('options').optional().isObject()
], validate, wrap(async (req, res) => {
  const { reportType, plantId, startDate, endDate, options } = req.body;
  res.status(201).json(await Report.create({ userId: req.user._id, reportType, plantId: plantId || '', startDate, endDate, options: options || {} }));
}));

module.exports = router;