const Notification = require('../models/Notification');
const User = require('../models/User');

exports.notify = async (userId, title, message, type = 'maintenance') => {
  if (!userId) return;
  await Notification.create({ userId, title, message, type });
};

exports.notifyAdmins = async (title, message, type = 'maintenance') => {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  if (admins.length) await Notification.insertMany(admins.map((a) => ({ userId: a._id, title, message, type })));
};