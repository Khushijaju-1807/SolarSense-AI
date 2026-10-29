/* SolarSense AI - Authentication
   Connected to the Node.js / Express / MongoDB API via api.js */

const $ = (id) => document.getElementById(id);

function getSession() {
  return window.api ? window.api.getUser() : null;
}

function setSession(u) {
  if (window.api) window.api.setUser(u);
}

function homeFor(role) {
  return role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
}

function logout() {
  if (window.api) window.api.logout();
  else location.href = 'login.html';
}

/* Use on every protected page: const me = requireRole('user'); */
function requireRole(role) {
  const user = window.api ? window.api.getUser() : null;
  const token = window.api ? window.api.getToken() : null;
  const currentFile = location.pathname.split('/').pop() || '';

  if (!user || !token) {
    location.href = 'login.html?next=' + encodeURIComponent(currentFile);
    return null;
  }

  if (user.role !== role) {
    location.href = homeFor(user.role);
    return null;
  }

  return user;
}

window.getSession = getSession;
window.setSession = setSession;
window.homeFor = homeFor;
window.logout = logout;
window.requireRole = requireRole;

/* ---------- validation helpers ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function showAlert(el, type, msg) {
  if (!el) return;
  el.className = 'alert show ' + type;
  el.textContent = msg;
}

function hideAlert(el) {
  if (!el) return;
  el.className = 'alert';
  el.textContent = '';
}

function setErr(input, msg) {
  if (!input) return !msg;
  const lbl = input.closest('label');
  const span = lbl ? lbl.querySelector('.err') : null;
  if (span) span.textContent = msg || '';
  input.classList.toggle('invalid', !!msg);
  return !msg;
}

document.querySelectorAll('.pw button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'Hide' : 'Show';
  });
});

/* ---------- LOGIN PAGE ---------- */
const loginForm = $('loginForm');
if (loginForm) {
  const qs = new URLSearchParams(location.search);
  let role = qs.get('role') === 'admin' || (qs.get('next') || '').startsWith('admin-') ? 'admin' : 'user';
  const tabs = document.querySelectorAll('.tab');

  function setRole(r) {
    role = r;
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.role === r));
    $('loginTitle').textContent = r === 'admin' ? 'Admin sign in' : 'Sign in to your account';
    hideAlert($('loginAlert'));
  }

  tabs.forEach((t) => t.addEventListener('click', () => setRole(t.dataset.role)));
  setRole(role);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('loginEmail');
    const pass = $('loginPassword');
    const alertBox = $('loginAlert');
    hideAlert(alertBox);

    const okEmail = setErr(email, EMAIL_RE.test(email.value.trim()) ? '' : 'Enter a valid email address.');
    const okPass = setErr(pass, pass.value ? '' : 'Enter your password.');
    if (!okEmail || !okPass) return;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = await window.api.login(email.value.trim(), pass.value, role);
      showAlert(alertBox, 'ok', 'Signed in. Redirecting...');

      const next = new URLSearchParams(location.search).get('next') || '';
      const okNext = /^[a-z-]+\.html$/.test(next) && next !== 'login.html' && next !== 'register.html'
        && (data.user.role === 'admin') === next.startsWith('admin-');

      setTimeout(() => {
        location.href = okNext ? next : homeFor(data.user.role);
      }, 500);
    } catch (err) {
      showAlert(alertBox, 'error', err.message || 'Email or password is incorrect.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  /* Forgot password */
  const forgotForm = $('forgotForm');
  if (forgotForm) {
    const forgotLink = $('forgotLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        forgotForm.classList.remove('hidden');
        const tabEl = document.querySelector('.tabs');
        if (tabEl) tabEl.classList.add('hidden');
      });
    }
    const backBtn = $('backToLogin');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        forgotForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        const tabEl = document.querySelector('.tabs');
        if (tabEl) tabEl.classList.remove('hidden');
      });
    }
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('forgotEmail');
      if (!setErr(email, EMAIL_RE.test(email.value.trim()) ? '' : 'Enter a valid email address.')) return;
      showAlert($('forgotAlert'), 'ok', 'If this email is registered, a reset link will be sent. (Demo: no email is actually sent.)');
    });
  }
}

/* ---------- REGISTER PAGE ---------- */
const registerForm = $('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('regName'), email = $('regEmail'), phone = $('regPhone');
    const pass = $('regPassword'), confirm = $('regConfirm'), alertBox = $('regAlert');
    hideAlert(alertBox);

    const results = [
      setErr(name, name.value.trim().length >= 3 ? '' : 'Enter your full name.'),
      setErr(email, EMAIL_RE.test(email.value.trim()) ? '' : 'Enter a valid email address.'),
      setErr(phone, PHONE_RE.test(phone.value.trim()) ? '' : 'Enter a valid 10-digit mobile number.'),
      setErr(pass, pass.value.length >= 8 && /[A-Za-z]/.test(pass.value) && /\d/.test(pass.value)
        ? '' : 'Use 8+ characters with letters and numbers.'),
      setErr(confirm, confirm.value === pass.value && confirm.value ? '' : 'Passwords do not match.')
    ];
    if (results.includes(false)) return;

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await window.api.register({
        name: name.value.trim(),
        email: email.value.trim().toLowerCase(),
        phone: phone.value.trim(),
        password: pass.value,
        confirmPassword: confirm.value
      });

      showAlert(alertBox, 'ok', 'Account created. Taking you to sign in...');
      setTimeout(() => { location.href = 'login.html'; }, 1200);
    } catch (err) {
      showAlert(alertBox, 'error', err.message || 'Registration failed.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}