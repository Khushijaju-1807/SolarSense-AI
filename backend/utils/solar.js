const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayISO = () => iso(new Date());

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What a healthy plant should produce: seasonal sunshine x capacity (monsoon dip around July)
function expectedFor(date, capacity) {
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  let sun = 5.4 + 0.9 * Math.sin((2 * Math.PI * (doy - 80)) / 365);
  sun -= 1.6 * Math.exp(-Math.pow((doy - 205) / 30, 2));
  return +(capacity * sun * 0.78).toFixed(1);
}

// Simulated history from installation date to today (software-only project: no real sensors)
function simulateRecords(plantId, capacity, installationDate) {
  const r = rng((parseInt(plantId.replace(/\D/g, ''), 10) || 7) * 13);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = [];
  for (let d = new Date(installationDate + 'T00:00:00'); d <= today; d.setDate(d.getDate() + 1)) {
    const date = new Date(d), expected = expectedFor(date, capacity);
    out.push({ plantId, date: iso(date), energyGenerated: +(expected * (0.9 + r() * 0.14)).toFixed(1), expectedEnergy: expected });
  }
  return out;
}

module.exports = { iso, addDays, todayISO, expectedFor, simulateRecords };