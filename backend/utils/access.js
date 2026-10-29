const SolarPlant = require('../models/SolarPlant');

exports.findAccessiblePlant = async (user, plantId) => {
  const plant = await SolarPlant.findOne({ plantId });
  if (!plant) return null;
  if (user.role === 'admin' || String(plant.userId) === String(user._id)) return plant;
  return null;
};