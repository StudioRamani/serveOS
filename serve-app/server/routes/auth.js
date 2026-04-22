const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT u.*, v.id as volunteer_id, v.preferred_name FROM users u LEFT JOIN volunteers v ON v.user_id = u.id WHERE u.email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, volunteerId: user.volunteer_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        preferredName: user.preferred_name,
        email: user.email,
        role: user.role,
        volunteerId: user.volunteer_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.name, u.email, u.role, u.phone, u.campus_id, v.id as volunteer_id, v.preferred_name, v.photo_url FROM users u LEFT JOIN volunteers v ON v.user_id = u.id WHERE u.id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  const { name, email, password, phone, role = 'volunteer' } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name, email, phone, hash, role]
    );
    const user = result.rows[0];
    if (role === 'volunteer') {
      await pool.query('INSERT INTO volunteers (user_id) VALUES ($1)', [user.id]);
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
