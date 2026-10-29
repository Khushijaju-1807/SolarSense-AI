/* SolarSense AI - Admin UI Helpers */
const PLANT_STATUSES = ['Operational', 'Under Maintenance', 'Inactive'];
const TECHNICIANS = ['Ravi Patil', 'Sneha Kulkarni', 'Amit Deshmukh', 'Priya Joshi'];

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Modal UI */
function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.remove();
}

function openModal(title, html) {
  closeModal();
  const m = document.createElement('div');
  m.id = 'modal';
  m.className = 'modal-scrim';
  m.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="drawer-head"><h3>' + title +
    '</h3><button type="button" id="mClose" aria-label="Close">&times;</button></div><div class="modal-body">' + html + '</div></div>';
  document.body.appendChild(m);
  m.addEventListener('mousedown', (e) => {
    if (e.target === m || e.target.id === 'mClose') closeModal();
  });
  return m;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});