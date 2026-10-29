const router = require('express').Router();
const { param } = require('express-validator');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const wrap = require('../utils/wrap');

router.use(protect);

/* GET /api/notifications -> { items: latest 30, unread } */
router.get('/', wrap(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ userId: req.user._id, isRead: false })
  ]);
  res.json({ items, unread });
}));

router.put('/read-all', wrap(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read.' });
}));

router.put('/:id/read', [param('id').isMongoId()], validate, wrap(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
  if (!n) return res.status(404).json({ message: 'Notification not found.' });
  res.json(n);
}));

module.exports = router;