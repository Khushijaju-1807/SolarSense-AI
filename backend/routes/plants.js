const router = require('express').Router();
const { body, param } = require('express-validator');
const SolarPlant = require('../models/SolarPlant');
const EnergyRecord = require('../models/EnergyRecord');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const nextId = require('../utils/nextId');
const pick = require('../utils/pick');
const { notify } = require('../utils/notify');
const { findAccessiblePlant } = require('../utils/access');
const { todayISO, simulateRecords } = require('../utils/solar');

router.use(protect);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = ['Operational', 'Under Maintenance', 'Inactive'];
const notFuture = (v) => { if (v > todayISO()) throw new Error('Installation date cannot be in the future.'); return true; };

const rules = (opt) => {
  const f = (n) => (opt ? body(n).optional() : body(n));
  return [
    f('plantName').trim().isLength({ min: 3, max: 80 }).withMessage('Enter the plant name.'),
    f('location').trim().isLength({ min: 3, max: 120 }).withMessage('Enter the location.'),
    f('capacity').isFloat({ min: 1, max: 1000 }).withMessage('Enter a capacity from 1 to 1000 kW.').toFloat(),
    f('numberOfPanels').isInt({ min: 1, max: 100000 }).withMessage('Enter a whole number of panels.').toInt(),
    f('installationDate').matches(DATE).withMessage('Enter a valid installation date.').custom(notFuture),
    body('userId').optional({ values: 'falsy' }).isMongoId().withMessage('Choose a valid owner.'),
    body('status').optional().isIn(STATUS).withMessage('Choose a valid status.')
  ];
};
const codeRule = param('plantId').matches(/^SP-\d+$/).withMessage('Invalid plant ID.');

/* GET /api/plants  (users: their own, admin: all) */
router.get('/', wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  res.json(await SolarPlant.find(filter).sort({ plantId: 1 }).populate('userId', 'name email').lean());
}));

router.get('/:plantId', [codeRule], validate, wrap(async (req, res) => {
  const plant = await findAccessiblePlant(req.user, req.params.plantId);
  if (!plant) return res.status(404).json({ message: 'Plant not found.' });
  res.json(await plant.populate('userId', 'name email'));
}));

/* Admin: create a plant. Simulated history is generated so charts are not empty. */
router.post('/', restrictTo('admin'), rules(false), validate, wrap(async (req, res) => {
  const { plantName, location, capacity, numberOfPanels, installationDate, status } = req.body;
  let userId = null;
  if (req.body.userId) {
    const owner = await User.findOne({ _id: req.body.userId, role: 'user' });
    if (!owner) return res.status(400).json({ message: 'Owner not found.' });
    userId = owner._id;
  }
  const plant = await SolarPlant.create({
    plantId: await nextId('SP', SolarPlant, 'plantId', 1001),
    plantName, location, capacity, numberOfPanels, installationDate, userId, status
  });
  await EnergyRecord.insertMany(simulateRecords(plant.plantId, plant.capacity, plant.installationDate));
  if (userId) await notify(userId, 'Solar plant assigned', plant.plantName + ' (' + plant.plantId + ') is now linked to your account.', 'user');
  res.status(201).json(await plant.populate('userId', 'name email'));
}));

router.put('/:plantId', restrictTo('admin'), [codeRule, ...rules(true)], validate, wrap(async (req, res) => {
  const plant = await SolarPlant.findOne({ plantId: req.params.plantId });
  if (!plant) return res.status(404).json({ message: 'Plant not found.' });
  const data = pick(req.body, ['plantName', 'location', 'capacity', 'numberOfPanels', 'installationDate', 'status']);
  let newOwner = null;
  if (req.body.userId !== undefined) {
    if (req.body.userId) {
      const owner = await User.findOne({ _id: req.body.userId, role: 'user' });
      if (!owner) return res.status(400).json({ message: 'Owner not found.' });
      data.userId = owner._id;
      if (String(owner._id) !== String(plant.userId)) newOwner = owner._id;
    } else data.userId = null;
  }
  Object.assign(plant, data);
  await plant.save();
  if (newOwner) await notify(newOwner, 'Solar plant assigned', plant.plantName + ' (' + plant.plantId + ') is now linked to your account.', 'user');
  res.json(await plant.populate('userId', 'name email'));
}));

router.delete('/:plantId', restrictTo('admin'), [codeRule], validate, wrap(async (req, res) => {
  const plant = await SolarPlant.findOneAndDelete({ plantId: req.params.plantId });
  if (!plant) return res.status(404).json({ message: 'Plant not found.' });
  await EnergyRecord.deleteMany({ plantId: plant.plantId });
  res.json({ message: 'Plant deleted.' });
}));

module.exports = router;