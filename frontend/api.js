/* SolarSense AI - API Client
   Handles JWT authentication, automatic Authorization headers,
   API request wrapping, and 401 redirect to login. */

(function (root) {
  const TOKEN_KEY = 'ss_token';
  const USER_KEY = 'ss_user';
  const SESSION_KEY = 'ss_session'; // kept for backward compatibility

  const api = {
    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY) || null;
      } catch (e) {
        return null;
      }
    },

    setToken(token) {
      try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
    },

    getUser() {
      try {
        const u = localStorage.getItem(USER_KEY);
        if (u) return JSON.parse(u);
        const s = localStorage.getItem(SESSION_KEY);
        if (s) return JSON.parse(s);
      } catch (e) {}
      return null;
    },

    setUser(user) {
      try {
        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          // keep ss_session synced so legacy code referencing it works
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            id: user._id || user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }));
        } else {
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {}
    },

    setAuth(token, user) {
      this.setToken(token);
      this.setUser(user);
    },

    clearAuth() {
      this.setToken(null);
      this.setUser(null);
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {}
    },

    logout() {
      this.clearAuth();
      location.href = 'login.html';
    },

    async request(endpoint, options = {}) {
      // Always talk to the Express backend, even if the page is opened from Live Server (5500)
      const API_ORIGIN = (location.port === '5000' || (location.protocol !== 'file:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'))
        ? ''                          // same server (port 5000, or deployed online)
        : 'http://localhost:5000';    // Live Server / file preview -> backend on 5000
      const apiPath = endpoint.startsWith('/api') ? endpoint : '/api' + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
      const url = endpoint.startsWith('http') ? endpoint : API_ORIGIN + apiPath;
      const headers = { ...(options.headers || {}) };

      const token = this.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = 'Bearer ' + token;
      }

      let body = options.body;
      if (body && typeof body === 'object' && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
      }

      const config = {
        ...options,
        headers,
        body
      };

      let res;
      try {
        res = await fetch(url, config);
      } catch (networkErr) {
        throw new Error('Network error. Please check your connection.');
      }

      // Handle 401 Unauthorized
      if (res.status === 401) {
        this.clearAuth();
        const currentFile = location.pathname.split('/').pop() || '';
        if (currentFile !== 'login.html' && currentFile !== 'register.html' && currentFile !== 'index.html') {
          location.href = 'login.html?next=' + encodeURIComponent(currentFile);
        }
      }

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { message: text };
      }

      if (!res.ok) {
        const error = new Error(data && data.message ? data.message : 'Request failed (' + res.status + ')');
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    },

    get(endpoint, options = {}) {
      return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, body, options = {}) {
      return this.request(endpoint, { ...options, method: 'POST', body });
    },

    put(endpoint, body, options = {}) {
      return this.request(endpoint, { ...options, method: 'PUT', body });
    },

    delete(endpoint, options = {}) {
      return this.request(endpoint, { ...options, method: 'DELETE' });
    },

    // Auth endpoints
    async login(email, password, role) {
      const data = await this.post('/auth/login', { email, password, role });
      if (data && data.token && data.user) {
        this.setAuth(data.token, data.user);
      }
      return data;
    },

    async register(userData) {
      const data = await this.post('/auth/register', userData);
      if (data && data.token && data.user) {
        this.setAuth(data.token, data.user);
      }
      return data;
    },

    async getMe() {
      const data = await this.get('/auth/me');
      if (data && data.user) {
        this.setUser(data.user);
      }
      return data && data.user ? data.user : data;
    },

    updateMe(userData) {
      return this.put('/auth/me', userData);
    },

    changePassword(currentPassword, newPassword) {
      return this.put('/auth/password', { currentPassword, newPassword });
    },

    // Resources shortcuts
    getNotifications() { return this.get('/notifications'); },
    markAllNotificationsRead() { return this.put('/notifications/read-all'); },
    markNotificationRead(id) { return this.put('/notifications/' + id + '/read'); },

    getPlants() { return this.get('/plants'); },
    getPlant(plantId) { return this.get('/plants/' + plantId); },
    createPlant(data) { return this.post('/plants', data); },
    updatePlant(plantId, data) { return this.put('/plants/' + plantId, data); },
    deletePlant(plantId) { return this.delete('/plants/' + plantId); },

    getEnergy(params = {}) {
      const qs = new URLSearchParams();
      if (params.plantId) qs.set('plantId', params.plantId);
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      const q = qs.toString();
      return this.get('/energy' + (q ? '?' + q : ''));
    },

    getInsights(plantId) { return this.get('/insights/' + plantId); },

    getMaintenance(params = {}) {
      const qs = new URLSearchParams();
      if (params.status) qs.set('status', params.status);
      if (params.priority) qs.set('priority', params.priority);
      const q = qs.toString();
      return this.get('/maintenance' + (q ? '?' + q : ''));
    },
    getMaintenanceById(requestId) { return this.get('/maintenance/' + requestId); },
    createMaintenance(data) { return this.post('/maintenance', data); },
    updateMaintenance(requestId, data) { return this.put('/maintenance/' + requestId, data); },

    getProducts() { return this.get('/products'); },

    getOrders() { return this.get('/orders'); },
    createOrder(data) { return this.post('/orders', data); },
    cancelOrder(orderId) { return this.put('/orders/' + orderId + '/cancel'); },
    updateOrderStatus(orderId, status) { return this.put('/orders/' + orderId + '/status', { status }); },

    getReports() { return this.get('/reports'); },
    createReport(data) { return this.post('/reports', data); },

    getAdminOverview() { return this.get('/admin/overview'); },

    getUsers(q = '') {
      return this.get('/users' + (q ? '?q=' + encodeURIComponent(q) : ''));
    },
    getUserDetails(id) { return this.get('/users/' + id); },
    createUser(data) { return this.post('/users', data); },
    updateUser(id, data) { return this.put('/users/' + id, data); },
    deleteUser(id) { return this.delete('/users/' + id); }
  };

  root.api = api;
})(typeof window !== 'undefined' ? window : this);