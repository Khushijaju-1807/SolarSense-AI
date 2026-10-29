/* Shared shell for all logged-in pages.
   Requires api.js, auth.js loaded first. */
(function () {
  const me = requireRole(document.body.dataset.role || 'user');
  if (!me) return;
  window.ME = me;

  const NAV = {
    user: [
      ['dashboard.html', 'Dashboard'],
      ['plant.html', 'Solar Plant'],
      ['analytics.html', 'Energy Analytics'],
      ['catalog.html', 'Catalog & Orders'],
      ['maintenance.html', 'Maintenance'],
      ['reports.html', 'Reports'],
      ['savings.html', 'Savings Calculator'],
      ['profile.html', 'Profile']
    ],
        admin: [
      ['admin-dashboard.html', 'Dashboard'],
      ['admin-users.html', 'Users'],
      ['admin-plants.html', 'Solar Plants'],
      ['admin-maintenance.html', 'Maintenance'],
      ['admin-orders.html', 'Orders'],
      ['admin-products.html', 'Products'],
      ['admin-technicians.html', 'Technicians'],
      ['admin-reports.html', 'Reports & Analytics']
    ]
  };

  const file = location.pathname.split('/').pop() || 'dashboard.html';
  const title = document.body.dataset.title || 'Dashboard';
  const initials = me.name
    ? me.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return dateStr;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + 'd ago';
    return String(dateStr).slice(0, 10);
  }

  /* ---- build shell ---- */
  const content = document.getElementById('page');
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.innerHTML = `
    <aside class="sidebar">
      <a href="${NAV[me.role][0][0]}" class="logo">
        <span class="logo-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="#F5A300"><circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="#F5A300" stroke-width="2" stroke-linecap="round"/></svg></span>
        SolarSense AI
      </a>
      <nav class="side-nav">
        ${NAV[me.role].map(([href, label]) => `<a href="${href}" class="${href === file ? 'active' : ''}">${label}</a>`).join('')}
      </nav>
      <a href="index.html" class="side-site">&larr; Back to website</a>
      <p class="side-foot">${me.role === 'admin' ? 'Admin panel' : 'User portal'}<br>SolarSense AI Platform</p>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="menu-btn" id="menuBtn" aria-label="Open menu">&#9776;</button>
        <h1>${title}</h1>
        <div class="notif">
          <button class="bell" id="bellBtn" aria-label="Notifications">&#128276;<span class="dot" id="bellDot"></span></button>
          <div class="notif-panel" id="notifPanel"></div>
        </div>
        <div class="user-pill"><div class="avatar">${initials}</div><span>${esc(me.name)}</span></div>
        <button class="logout" id="logoutBtn">Log out</button>
      </header>
    </div>`;

  document.body.prepend(shell);
  if (content) {
    shell.querySelector('.main').appendChild(content);
  }

  /* ---- notifications from /api/notifications ---- */
  async function loadNotifs() {
    if (!window.api) return;
    try {
      const res = await window.api.getNotifications();
      const items = res.items || [];
      const unread = res.unread || 0;

      const dot = document.getElementById('bellDot');
      if (dot) {
        dot.textContent = unread;
        dot.style.display = unread ? 'block' : 'none';
      }

      const panel = document.getElementById('notifPanel');
      if (panel) {
        panel.innerHTML =
          '<div class="notif-head">Notifications <button type="button" id="markRead">Mark all read</button></div>' +
          (items.length
            ? items.map((n) => `
                <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n._id}">
                  <b>${esc(n.title)}</b>${esc(n.message)}<br>
                  <small>${timeAgo(n.createdAt)}</small>
                </div>
              `).join('')
            : '<div class="notif-item" style="color:var(--muted)">No notifications</div>');

        const mr = document.getElementById('markRead');
        if (mr) {
          mr.onclick = async (e) => {
            e.stopPropagation();
            try {
              await window.api.markAllNotificationsRead();
              await loadNotifs();
            } catch (err) {
              console.error('Failed to mark all notifications read', err);
            }
          };
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }

  loadNotifs();

  const bellBtn = document.getElementById('bellBtn');
  if (bellBtn) {
    bellBtn.onclick = (e) => {
      e.stopPropagation();
      document.getElementById('notifPanel').classList.toggle('open');
    };
  }

  const notifPanel = document.getElementById('notifPanel');
  if (notifPanel) {
    notifPanel.addEventListener('click', async (e) => {
      const item = e.target.closest('.notif-item.unread');
      if (item && item.dataset.id) {
        try {
          await window.api.markNotificationRead(item.dataset.id);
          await loadNotifs();
        } catch (err) {
          console.error('Failed to mark notification read', err);
        }
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif')) {
      const p = document.getElementById('notifPanel');
      if (p) p.classList.remove('open');
    }
  });

  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.onclick = () => shell.classList.toggle('open');
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }
})();