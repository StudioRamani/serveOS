const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Correct CORS (ONLY ONE)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://serve-os-indol.vercel.app'
  ],
  credentials: true
}));

// ✅ JSON parser (ONLY ONE)
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/events', require('./routes/events'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/scheduling', require('./routes/scheduling'));
app.use('/api/flow', require('./routes/flow'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serve app running on port ${PORT}`));