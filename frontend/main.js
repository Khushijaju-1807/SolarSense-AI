// Mobile menu
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle.addEventListener('click', () => links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

// Contact form (front-end only for now; connect to the backend API later)
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('formMsg').textContent = 'Thanks! Your message has been recorded.';
  e.target.reset();
});

// Make the main page aware of the signed-in user
(function () {
  const s = window.api ? window.api.getUser() : (() => {
    try { return JSON.parse(localStorage.getItem('ss_session')); } catch (e) { return null; }
  })();
  if (!s) return;
  const home = s.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
  const auth = document.getElementById('navAuth'), cta = document.getElementById('navCta');
  if (auth) auth.innerHTML = '<a href="' + home + '">' + (s.role === 'admin' ? 'Admin dashboard' : 'My dashboard') + '</a>';
  if (cta) cta.innerHTML = '<button type="button" class="btn btn-outline btn-sm" id="navLogout">Log out</button>';
  const out = document.getElementById('navLogout');
  if (out) out.addEventListener('click', () => {
    if (window.api) window.api.logout();
    else { localStorage.removeItem('ss_session'); location.reload(); }
  });
  document.querySelectorAll('.hero-cta a[href="register.html"]').forEach((a) => (a.href = home));
})();