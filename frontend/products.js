/* Sample catalogue. Prices and specs are placeholders for the demo.
   To use a real photo, add  img: 'panel540.jpg'  to a product (file in the same folder). */
const PRODUCTS = [
  { id: 'P01', name: 'Mono PERC Solar Panel 540W', category: 'Solar Panels', price: 14500, unit: 'panel', desc: 'High-efficiency monocrystalline panel for rooftop plants.', specs: ['540 W rated power', 'Anti-reflective glass', 'Suitable for homes and offices'], stock: 'In stock' },
  { id: 'P02', name: 'Polycrystalline Panel 330W', category: 'Solar Panels', price: 8900, unit: 'panel', desc: 'Budget-friendly panel for small installations.', specs: ['330 W rated power', 'Durable aluminium frame', 'Good for small rooftops'], stock: 'In stock' },
  { id: 'P03', name: 'Bifacial Solar Panel 580W', category: 'Solar Panels', price: 17800, unit: 'panel', desc: 'Captures light on both sides for extra generation.', specs: ['580 W rated power', 'Dual-side generation', 'Best for open mounting'], stock: 'Made to order' },
  { id: 'P04', name: 'On-Grid Inverter 5 kW', category: 'Inverters', price: 42000, unit: 'unit', desc: 'Converts panel output to grid-ready power.', specs: ['5 kW capacity', 'Wi-Fi monitoring ready', 'Built-in protections'], stock: 'In stock' },
  { id: 'P05', name: 'Hybrid Inverter 5 kW', category: 'Inverters', price: 78000, unit: 'unit', desc: 'Works with battery storage and the grid.', specs: ['5 kW capacity', 'Battery compatible', 'Backup power output'], stock: 'Made to order' },
  { id: 'P06', name: 'Lithium Battery 5 kWh', category: 'Batteries', price: 105000, unit: 'unit', desc: 'Stores surplus energy for evening and outages.', specs: ['5 kWh storage', 'Long cycle life', 'Wall-mount design'], stock: 'Made to order' },
  { id: 'P07', name: 'Smart Energy Meter', category: 'Monitoring', price: 4500, unit: 'unit', desc: 'Measures generation and consumption accurately.', specs: ['Single and three phase', 'Digital display', 'Data logging support'], stock: 'In stock' },
  { id: 'P08', name: 'Wi-Fi Monitoring Dongle', category: 'Monitoring', price: 3800, unit: 'unit', desc: 'Connects your inverter to the SolarSense platform.', specs: ['Plug-and-play setup', 'Works with common inverters', 'Future IoT integration'], stock: 'In stock' },
  { id: 'P09', name: 'Mounting Structure Kit (per kW)', category: 'Accessories', price: 6000, unit: 'kit', desc: 'Galvanised rooftop mounting structure.', specs: ['Corrosion resistant', 'Adjustable tilt', 'Includes fasteners'], stock: 'In stock' },
  { id: 'P10', name: 'DC Cable and Connector Kit', category: 'Accessories', price: 3200, unit: 'kit', desc: 'UV-resistant solar cable with MC4 connectors.', specs: ['Solar-grade copper cable', 'Weatherproof connectors', 'Standard 20 m length'], stock: 'In stock' },
  { id: 'P11', name: 'Panel Cleaning Kit', category: 'Accessories', price: 2400, unit: 'kit', desc: 'Soft brush and extension pole for safe cleaning.', specs: ['Non-abrasive brush', 'Telescopic pole', 'Keeps output high'], stock: 'In stock' },
  { id: 'P12', name: 'Surge Protection Box (ACDB/DCDB)', category: 'Accessories', price: 5500, unit: 'unit', desc: 'Protects your system from surges and faults.', specs: ['Combined AC and DC protection', 'Weatherproof enclosure', 'Easy installation'], stock: 'In stock' }
];

/* Simple illustrations per category (used when a product has no photo) */
function productArt(cat) {
  const base = '<svg width="170" height="115" viewBox="0 0 170 115">';
  const art = {
    'Solar Panels': '<rect x="20" y="14" width="130" height="80" rx="6" fill="#2F4778" stroke="#9FB0CC" stroke-width="2"/><g stroke="#9FB0CC" stroke-width="1.5"><path d="M63 14v80M107 14v80M20 41h130M20 67h130"/></g><circle cx="140" cy="24" r="8" fill="#F5A300"/>',
    'Inverters': '<rect x="38" y="12" width="94" height="90" rx="10" fill="#1B2F55" stroke="#9FB0CC" stroke-width="2"/><rect x="52" y="26" width="66" height="26" rx="4" fill="#0F1F3D"/><path d="M58 44l10-12 10 8 12-14 14 10" stroke="#F5A300" stroke-width="3" fill="none"/><circle cx="62" cy="76" r="5" fill="#1E9E6A"/><circle cx="82" cy="76" r="5" fill="#F5A300"/><rect x="98" y="72" width="20" height="8" rx="3" fill="#2F4778"/>',
    'Batteries': '<rect x="30" y="26" width="104" height="66" rx="10" fill="#1B2F55" stroke="#9FB0CC" stroke-width="2"/><rect x="134" y="48" width="10" height="22" rx="3" fill="#9FB0CC"/><rect x="40" y="36" width="70" height="46" rx="6" fill="#1E9E6A"/><path d="M80 40l-14 22h12l-4 16 16-24H78z" fill="#fff"/>',
    'Monitoring': '<circle cx="85" cy="58" r="40" fill="#1B2F55" stroke="#9FB0CC" stroke-width="2"/><path d="M52 70a34 34 0 0 1 66 0" stroke="#2F4778" stroke-width="8" fill="none"/><path d="M52 70a34 34 0 0 1 48-30" stroke="#F5A300" stroke-width="8" fill="none"/><path d="M85 62l18-16" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="85" cy="62" r="5" fill="#fff"/>',
    'Accessories': '<path d="M24 82c20-50 40 30 62-20s44 34 60-10" stroke="#F5A300" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="18" y="74" width="16" height="16" rx="4" fill="#9FB0CC"/><rect x="138" y="42" width="16" height="16" rx="4" fill="#9FB0CC"/>'
  };
  return base + (art[cat] || art['Accessories']) + '</svg>';
}

/* Orders (shared storage so the admin pages can read them later) */
const ORDER_STEPS = ['Placed', 'Confirmed', 'Dispatched', 'Delivered'];
function getOrders() {
  try { const s = JSON.parse(localStorage.getItem('ss_orders')); if (Array.isArray(s)) return s; } catch (e) {}
  return [];
}
function saveOrders(o) { localStorage.setItem('ss_orders', JSON.stringify(o)); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}