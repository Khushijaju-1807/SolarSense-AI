const router = require('express').Router();
const { body, param } = require('express-validator');
const Technician = require('../models/Technician');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const nextId = require('../utils/nextId');
const pick = require('../utils/pick');

router.use(protect, restrictTo('admin'));

const FIELDS = ['name', 'phone', 'email', 'specialization', 'status'];
const codeRule = param('technicianId').matches(/^TC-\d+$/).withMessage('Invalid technician ID.');

const rules = (opt) => {
  const f = (n) => (opt ? body(n).optional() : body(n));
  return [
    f('name').trim().isLength({ min: 3, max: 60 }).withMessage('Enter the technician name.'),
    f('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number.'),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email.'),
    body('specialization').optional().trim().isLength({ max: 60 }),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Choose a valid status.')
  ];
};

/* GET /api/technicians  - list with the number of open jobs each one has */
router.get('/', wrap(async (req, res) => {
  const techs = await Technician.find().sort({ technicianId: 1 }).select('-__v').lean();
  const open = await MaintenanceRequest.aggregate([
    { $match: { technicianId: { $ne: '' }, status: { $in: ['Assigned', 'In Progress'] } } },
    { $group: { _id: '$technicianId', n: { $sum: 1 } } }
  ]);
  const counts = Object.fromEntries(open.map((o) => [o._id, o.n]));
  res.json(techs.map((t) => ({ ...t, openJobs: counts[t.technicianId] || 0 })));
}));

router.post('/', rules(false), validate, wrap(async (req, res) => {
  const tech = await Technician.create({
    ...pick(req.body, FIELDS),
    technicianId: await nextId('TC', Technician, 'technicianId', 1001)
  });
  res.status(201).json(tech);
}));

router.put('/:technicianId', [codeRule, ...rules(true)], validate, wrap(async (req, res) => {
  const tech = await Technician.findOneAndUpdate(
    { technicianId: req.params.technicianId }, pick(req.body, FIELDS), { new: true, runValidators: true });
  if (!tech) return res.status(404).json({ message: 'Technician not found.' });
  // keep the name/phone on existing jobs in step with the technician record
  await MaintenanceRequest.updateMany(
    { technicianId: tech.technicianId },
    { assignedTechnician: tech.name, technicianPhone: tech.phone });
  res.json(tech);
}));

router.delete('/:technicianId', [codeRule], validate, wrap(async (req, res) => {
  const busy = await MaintenanceRequest.countDocuments({
    technicianId: req.params.technicianId, status: { $in: ['Assigned', 'In Progress'] } });
  if (busy) return res.status(409).json({ message: 'This technician has open jobs. Reassign them or set the technician to inactive.' });
  const tech = await Technician.findOneAndDelete({ technicianId: req.params.technicianId });
  if (!tech) return res.status(404).json({ message: 'Technician not found.' });
  res.json({ message: 'Technician deleted.' });
}));

module.exports = router;