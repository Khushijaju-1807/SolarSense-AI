const { iso, addDays, expectedFor } = require('./solar');

// records: oldest to newest, each { date, energyGenerated, expectedEnergy }
function alertsFrom(records, days = 14) {
  return records
    .slice(-days)
    .filter((r) => r.expectedEnergy > 0 && r.energyGenerated < 0.75 * r.expectedEnergy)
    .reverse()
    .map((r) => {
      const ratio = r.energyGenerated / r.expectedEnergy;
      let advice = 'Panel cleaning required';
      if (ratio < 0.5) advice = 'Possible panel malfunction. Maintenance inspection recommended';
      else if (ratio < 0.65) advice = 'Possible shading issue. Inspect the panel area';
      return {
        date: r.date, actual: r.energyGenerated, expected: r.expectedEnergy,
        drop: Math.round((1 - ratio) * 100), advice, level: ratio < 0.65 ? 'major' : 'minor'
      };
    });
}

function predictNext(records, capacity, n = 3) {
  const recent = records.slice(-14).filter((r) => r.expectedEnergy > 0);
  const healthy = recent.filter((r) => r.energyGenerated >= 0.75 * r.expectedEnergy);
  const factor = healthy.length ? healthy.reduce((a, r) => a + r.energyGenerated / r.expectedEnergy, 0) / healthy.length : 1;
  const base = new Date(); base.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(base, i + 1);
    return { date: iso(d), kwh: +(expectedFor(d, capacity) * factor).toFixed(1) };
  });
}

module.exports = { alertsFrom, predictNext };