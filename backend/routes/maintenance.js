const router = require('express').Router();
const { body, param, query } = require('express-validator');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const SolarPlant = require('../models/SolarPlant');
const Technician = require('../models/Technician');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const nextId = require('../utils/nextId');
const { notify, notifyAdmins } = require('../utils/notify');

router.use(protect);

const STATUSES = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const codeRule = param('requestId').matches(/^MR-\d+$/).withMessage('Invalid request ID.');

/* GET /api/maintenance?status=&priority=  (users: their own, admin: all) */
router.get('/', [
  query('status').optional().isIn(STATUSES),
  query('priority').optional().isIn(PRIORITIES)
], validate, wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  res.json(await MaintenanceRequest.find(filter).sort({ createdAt: -1 }).populate('userId', 'name email').lean());
}));

router.get('/:requestId', [codeRule], validate, wrap(async (req, res) => {
  const m = await MaintenanceRequest.findOne({ requestId: req.params.requestId }).populate('userId', 'name email');
  const ownerId = m && m.userId ? String(m.userId._id) : '';
  if (!m || (req.user.role !== 'admin' && ownerId !== String(req.user._id))) {
    return res.status(404).json({ message: 'Request not found.' });
  }
  res.json(m);
}));

/* User: raise a request. The date is set by the server (createdAt). */
router.post('/', restrictTo('user'), [
  body('plantId').trim().matches(/^SP-\d+$/).withMessage('Choose a valid plant.'),
  body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Enter a short issue title (5+ characters).'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Describe the issue (10+ characters).'),
  body('priority').isIn(PRIORITIES).withMessage('Choose a priority.')
], validate, wrap(async (req, res) => {
  const { plantId, title, description, priority } = req.body;
  const plant = await SolarPlant.findOne({ plantId, userId: req.user._id });
  if (!plant) return res.status(404).json({ message: 'Plant not found on your account.' });
  const m = await MaintenanceRequest.create({
    requestId: await nextId('MR', MaintenanceRequest, 'requestId', 1001),
    userId: req.user._id, plantId: plant.plantId, title, description, priority
  });
  await notifyAdmins('New maintenance request', m.requestId + ': ' + m.title + ' (' + m.priority + ')', 'maintenance');
  res.status(201).json(m);
}));

/* Admin: assign technician, change status, add a service note */
router.put('/:requestId', restrictTo('admin'), [
  codeRule,
  body('assignedTechnician').optional().trim().isLength({ max: 60 }),
  body('technicianId').optional().custom((v) => v === '' || /^TC-\d+$/.test(v)).withMessage('Choose a valid technician.'),
  body('status').optional().isIn(STATUSES).withMessage('Choose a valid status.'),
  body('note').optional().trim().isLength({ max: 500 }).withMessage('Service note is too long.')
], validate, wrap(async (req, res) => {
  const m = await MaintenanceRequest.findOne({ requestId: req.params.requestId });
  if (!m) return res.status(404).json({ message: 'Request not found.' });

  // Technician: pick one from the technicians list (preferred) or clear it with ''
  if (req.body.technicianId !== undefined) {
    if (req.body.technicianId === '') {
      m.assignedTechnician = ''; m.technicianId = ''; m.technicianPhone = '';
    } else {
      const t = await Technician.findOne({ technicianId: req.body.technicianId });
      if (!t) return res.status(400).json({ message: 'Technician not found.' });
      if (t.status !== 'active') return res.status(400).json({ message: 'That technician is inactive.' });
      m.assignedTechnician = t.name; m.technicianId = t.technicianId; m.technicianPhone = t.phone;
    }
  } else if (req.body.assignedTechnician !== undefined) {
    m.assignedTechnician = req.body.assignedTechnician; m.technicianId = ''; m.technicianPhone = '';
  }
  const tech = m.assignedTechnician;
  const phoneNote = m.technicianPhone ? ', phone ' + m.technicianPhone : '';
  let status = req.body.status || m.status;
  if (status === 'Pending' && tech) status = 'Assigned';
  if (status !== 'Pending' && !tech) {
    return res.status(400).json({ message: 'Assign a technician before moving past Pending.' });
  }

  const statusChanged = m.status !== status, techChanged = m.isModified('assignedTechnician');
  m.status = status;
  m.resolvedAt = status === 'Resolved' || status === 'Closed' ? m.resolvedAt || new Date() : null;
  if (req.body.note) m.serviceNotes.push({ text: req.body.note });
  await m.save();

  if (statusChanged) await notify(m.userId, 'Maintenance update', m.requestId + ' is now ' + status + (tech ? ' (technician: ' + tech + phoneNote + ')' : '') + '.', 'maintenance');
  else if (techChanged) await notify(m.userId, 'Technician assigned', m.requestId + ' has been assigned to ' + tech + phoneNote + '.', 'maintenance');

  res.json(await m.populate('userId', 'name email'));
}));

module.exports = router;