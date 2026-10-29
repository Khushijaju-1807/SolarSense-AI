const mongoose = require('mongoose');

const Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, seq: Number }));

// nextId('MR', MaintenanceRequest, 'requestId', 1001) -> 'MR-1004'
async function nextId(prefix, Model, field, start) {
  if (!(await Counter.findById(prefix))) {
    const last = await Model.findOne().sort({ [field]: -1 }).select(field).lean();
    const base = last ? parseInt(last[field].split('-')[1], 10) : start - 1;
    try { await Counter.create({ _id: prefix, seq: base }); } catch (e) { /* created at the same moment */ }
  }
  const c = await Counter.findOneAndUpdate({ _id: prefix }, { $inc: { seq: 1 } }, { new: true });
  return prefix + '-' + c.seq;
}

module.exports = nextId;
module.exports.Counter = Counter;