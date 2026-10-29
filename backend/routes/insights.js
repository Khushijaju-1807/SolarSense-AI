const router = require('express').Router();
const { param } = require('express-validator');
const EnergyRecord = require('../models/EnergyRecord');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');
const { findAccessiblePlant } = require('../utils/access');
const { alertsFrom, predictNext } = require('../utils/insights');
const { iso, addDays } = require('../utils/solar');

/* GET /api/insights/SP-1001 -> fault alerts (14 days) + next 3 days prediction */
router.get('/:plantId', protect, [param('plantId').matches(/^SP-\d+$/).withMessage('Invalid plant ID.')], validate, wrap(async (req, res) => {
  const plant = await findAccessiblePlant(req.user, req.params.plantId);
  if (!plant) return res.status(404).json({ message: 'Plant not found.' });
  const recent = (await EnergyRecord.find({ plantId: plant.plantId }).sort({ date: -1 }).limit(30).lean()).reverse();
  const alerts = alertsFrom(recent, 14);
  res.json({
    plantId: plant.plantId,
    alerts,
    prediction: predictNext(recent, plant.capacity, 3),
    faultActive: alerts.length > 0 && alerts[0].date >= iso(addDays(new Date(), -2)),
    model: 'rule-based (the Python ML models replace this in the AI step)'
  });
}));

module.exports = router;