const router = require('express').Router();
const User = require('../models/User');
const SolarPlant = require('../models/SolarPlant');
const EnergyRecord = require('../models/EnergyRecord');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Order = require('../models/Order');
const { protect, restrictTo } = require('../middleware/auth');
const wrap = require('../utils/wrap');
const { iso, addDays } = require('../utils/solar');
const { alertsFrom } = require('../utils/insights');

router.use(protect, restrictTo('admin'));

const count = (arr, key) => arr.reduce((m, x) => { m[x[key]] = (m[x[key]] || 0) + 1; return m; }, {});
const sum = (arr, key) => arr.reduce((a, x) => a + x[key], 0);
const r1 = (n) => +n.toFixed(1);

/* GET /api/admin/overview */
router.get('/overview', wrap(async (req, res) => {
  const now = new Date();
  const from30 = iso(addDays(now, -29)), from14 = iso(addDays(now, -13));

  const [users, plants, maint, orders, total, recent] = await Promise.all([
    User.find({ role: 'user' }).select('status').lean(),
    SolarPlant.find().sort({ plantId: 1 }).populate('userId', 'name').lean(),
    MaintenanceRequest.find().select('status priority').lean(),
    Order.find().select('status total').lean(),
    EnergyRecord.aggregate([{ $group: { _id: null, kwh: { $sum: '$energyGenerated' } } }]),
    EnergyRecord.find({ date: { $gte: from30 } }).sort({ date: 1 }).select('plantId date energyGenerated expectedEnergy').lean()
  ]);

  // Daily totals across all plants (last 30 days)
  const days = new Map();
  for (let i = 29; i >= 0; i--) { const d = iso(addDays(now, -i)); days.set(d, { date: d, actual: 0, expected: 0 }); }
  recent.forEach((r) => { const d = days.get(r.date); if (d) { d.actual += r.energyGenerated; d.expected += r.expectedEnergy; } });

  // Per-plant performance and fault alerts
  const allAlerts = [];
  const byPlant = plants.map((p) => {
    const rows = recent.filter((r) => r.plantId === p.plantId);
    const alerts = p.status === 'Operational'
      ? alertsFrom(rows.filter((r) => r.date >= from14), 14).map((a) => ({ ...a, plantId: p.plantId, plant: p.plantName }))
      : [];
    allAlerts.push(...alerts);
    return {
      plantId: p.plantId, name: p.plantName, owner: p.userId ? p.userId.name : 'Unassigned',
      capacity: p.capacity, status: p.status,
      actual30: r1(sum(rows, 'energyGenerated')), expected30: r1(sum(rows, 'expectedEnergy')), alerts14: alerts.length
    };
  });

  res.json({
    users: { total: users.length, active: users.filter((u) => u.status === 'active').length, inactive: users.filter((u) => u.status !== 'active').length },
    plants: { total: plants.length, capacity: sum(plants, 'capacity'), byStatus: count(plants, 'status') },
    energy: {
      totalKwh: r1(total[0] ? total[0].kwh : 0),
      daily30: [...days.values()].map((d) => ({ date: d.date, actual: r1(d.actual), expected: r1(d.expected) })),
      byPlant
    },
    maintenance: {
      total: maint.length, byStatus: count(maint, 'status'), byPriority: count(maint, 'priority'),
      open: maint.filter((m) => m.status !== 'Resolved' && m.status !== 'Closed').length
    },
    orders: {
      total: orders.length, byStatus: count(orders, 'status'),
      deliveredValue: sum(orders.filter((o) => o.status === 'Delivered'), 'total')
    },
    alerts: allAlerts.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
  });
}));

module.exports = router;