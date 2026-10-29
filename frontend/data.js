/* SolarSense AI - Solar Data Utilities */
const TARIFF = 8; // Rs per kWh (default)

let PLANT = {
  id: 'SP-1001',
  name: 'Sunrise Residency Plant',
  capacity: 6,
  panels: 12,
  location: 'Pune, Maharashtra',
  installed: '2025-03-15',
  status: 'Operational'
};

function iso(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  const date = new Date(d);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function dayOfYear(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
}

/* Expected kWh from season + capacity */
function expectedFor(d, capacity = (PLANT.capacity || 6)) {
  const doy = dayOfYear(new Date(d));
  let sun = 5.4 + 0.9 * Math.sin(2 * Math.PI * (doy - 80) / 365);
  sun -= 1.6 * Math.exp(-Math.pow((doy - 205) / 30, 2)); // monsoon dip
  return +(capacity * sun * 0.78).toFixed(1);
}

const sumKwh = (rows) => (rows || []).reduce((a, r) => a + (r.energy !== undefined ? r.energy : (r.energyGenerated || 0)), 0);
const inr = (n) => '\u20B9' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function monthlyTotals(data) {
  const m = {};
  (data || []).forEach((r) => {
    const k = r.date.slice(0, 7);
    const val = r.energy !== undefined ? r.energy : (r.energyGenerated || 0);
    m[k] = (m[k] || 0) + val;
  });
  return Object.entries(m).map(([k, v]) => ({ key: k, kwh: +v.toFixed(1) }));
}

/* Rule-based fault check */
function getAlerts(data, days = 14) {
  const rows = (data || []).map((r) => ({
    date: r.date,
    energy: r.energy !== undefined ? r.energy : (r.energyGenerated || 0),
    expected: r.expected !== undefined ? r.expected : (r.expectedEnergy || 0)
  }));
  return rows.slice(-days).filter((r) => r.expected > 0 && r.energy < 0.75 * r.expected).reverse().map((r) => {
    const ratio = r.energy / r.expected, drop = Math.round((1 - ratio) * 100);
    let advice = 'Panel cleaning required';
    if (ratio < 0.5) advice = 'Possible panel malfunction. Maintenance inspection recommended';
    else if (ratio < 0.65) advice = 'Possible shading issue. Inspect the panel area';
    return { date: r.date, actual: r.energy, expected: r.expected, drop, advice, level: ratio < 0.65 ? 'major' : 'minor' };
  });
}

/* Prediction estimate */
function predictNext(data, n = 3, capacity = (PLANT.capacity || 6)) {
  const rows = (data || []).map((r) => ({
    date: r.date,
    energy: r.energy !== undefined ? r.energy : (r.energyGenerated || 0),
    expected: r.expected !== undefined ? r.expected : (r.expectedEnergy || 0)
  }));
  const healthy = rows.slice(-14).filter((r) => r.expected > 0 && r.energy >= 0.75 * r.expected);
  const factor = healthy.length ? (healthy.reduce((a, r) => a + r.energy / r.expected, 0) / healthy.length) : 1;
  const out = [], base = new Date(); base.setHours(0, 0, 0, 0);
  for (let i = 1; i <= n; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i);
    out.push({ date: iso(d), kwh: +(expectedFor(d, capacity) * factor).toFixed(1) });
  }
  return out;
}