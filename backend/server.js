require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// Trust Render's (and similar) reverse proxy so express-rate-limit sees the real client IP.
app.set('trust proxy', 1);

// CSP is off because the pages use inline scripts and CDN libraries.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '100kb' }));

// The website is served from the frontend folder: open http://localhost:5000
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/plants', require('./routes/plants'));
app.use('/api/energy', require('./routes/energy'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request.' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0].message });
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  const server = app.listen(PORT, () => console.log('SolarSense running on http://localhost:' + PORT));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Port ' + PORT + ' is already in use. Stop the other process and try again.');
      process.exit(1);
    } else {
      throw err;
    }
  });
});
