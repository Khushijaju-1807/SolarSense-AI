const router = require('express').Router();
const { body, query } = require('express-validator');
const EnergyRecord = require('../models/EnergyRecord');
const SolarPlant = require('../models/SolarPlant');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const { findAccessiblePlant } = require('../utils/access');
const { notify, notifyAdmins } = require('../utils/notify');
const { todayISO, expectedFor } = require('../utils/solar');

router.use(protect);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* GET /api/energy?plantId=SP-1001&from=2026-09-01&to=2026-09-30
   Without plantId: all plants the user may see (admin: every plant). */
router.get('/', [
  query('plantId').optional().matches(/^SP-\d+$/).withMessage('Invalid plant ID.'),
  query('from').optional().matches(DATE).withMessage('From must be YYYY-MM-DD.'),
  query('to').optional().matches(DATE).withMessage('To must be YYYY-MM-DD.')
], validate, wrap(async (req, res) => {
  const filter = {};
  if (req.query.plantId) {
    const plant = await findAccessiblePlant(req.user, req.query.plantId);
    if (!plant) return res.status(404).json({ message: 'Plant not found.' });
    filter.plantId = plant.plantId;
  } else if (req.user.role !== 'admin') {
    const mine = await SolarPlant.find({ userId: req.user._id }).select('plantId');
    filter.plantId = { $in: mine.map((p) => p.plantId) };
  }
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  res.json(await EnergyRecord.find(filter).sort({ plantId: 1, date: 1 }).select('-__v').lean());
}));

/* POST /api/energy  (admin) add or correct one daily reading */
router.post('/', restrictTo('admin'), [
  body('plantId').trim().matches(/^SP-\d+$/).withMessage('Invalid plant ID.'),
  body('date').matches(DATE).withMessage('Date must be YYYY-MM-DD.')
    .custom((v) => { if (v > todayISO()) throw new Error('Date cannot be in the future.'); return true; }),
  body('energyGenerated').isFloat({ min: 0, max: 100000 }).withMessage('Enter the energy generated in kWh.').toFloat(),
  body('expectedEnergy').optional().isFloat({ min: 0, max: 100000 }).toFloat()
], validate, wrap(async (req, res) => {
  const plant = await SolarPlant.findOne({ plantId: req.body.plantId });
  if (!plant) return res.status(404).json({ message: 'Plant not found.' });
  const { plantId, date, energyGenerated } = req.body;
  const expectedEnergy = req.body.expectedEnergy ?? expectedFor(new Date(date + 'T00:00:00'), plant.capacity);
  const rec = await EnergyRecord.findOneAndUpdate(
    { plantId, date }, { energyGenerated, expectedEnergy },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  if (expectedEnergy > 0 && energyGenerated < 0.75 * expectedEnergy) {
    const drop = Math.round((1 - energyGenerated / expectedEnergy) * 100);
    await notify(plant.userId, 'Fault alert', 'Output was ' + drop + '% below expected on ' + date + '.', 'fault');
    if (energyGenerated < 0.5 * expectedEnergy) await notifyAdmins('Critical fault', plant.plantId + ' output was ' + drop + '% below expected on ' + date + '.', 'fault');
  }
  res.status(201).json(rec);
}));

module.exports = router;