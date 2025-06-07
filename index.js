const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Utility to check if user is active
function isUserActive(userId, callback) {
  db.query('SELECT status FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('DB error during status check:', err);
      return callback(err);
    }
    if (!results.length || results[0].status !== 'active') {
      return callback(null, false); // Not active or not found
    }
    callback(null, true);
  });
}

// Routes

app.get('/test', (req, res) => {
  res.send('API is working!');
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const insertQuery = `
    INSERT INTO users (name, email, password)
    VALUES (?, ?, ?)
  `;

  db.query(insertQuery, [name, email, password], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    return res.status(201).json({ message: 'User registered successfully' });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'User is blocked' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  });
});

app.get('/users', (req, res) => {
  const query = `
    SELECT id, name, email, status, registration_time, last_login_time
    FROM users
    ORDER BY last_login_time DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(results);
  });
});

app.post('/block-users', (req, res) => {
  const { ids, currentUserId } = req.body;
  if (!currentUserId) return res.status(400).json({ error: 'Current user ID required' });

  isUserActive(currentUserId, (err, isActive) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!isActive) return res.status(403).json({ error: 'You are not allowed to perform this action' });

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No users selected' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE users SET status = 'blocked' WHERE id IN (${placeholders})`;
    db.query(query, ids, (err) => {
      if (err) {
        console.error('Block error:', err);
        return res.status(500).json({ error: 'Failed to block users' });
      }
      res.json({ message: 'Users blocked successfully' });
    });
  });
});

app.post('/unblock-users', (req, res) => {
  const { ids, currentUserId } = req.body;
  if (!currentUserId) return res.status(400).json({ error: 'Current user ID required' });

  isUserActive(currentUserId, (err, isActive) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!isActive) return res.status(403).json({ error: 'You are not allowed to perform this action' });

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No users selected' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const query = `UPDATE users SET status = 'active' WHERE id IN (${placeholders})`;
    db.query(query, ids, (err) => {
      if (err) {
        console.error('Unblock error:', err);
        return res.status(500).json({ error: 'Failed to unblock users' });
      }
      res.json({ message: 'Users unblocked successfully' });
    });
  });
});

app.post('/delete-users', (req, res) => {
  const { ids, currentUserId } = req.body;
  if (!currentUserId) return res.status(400).json({ error: 'Current user ID required' });

  isUserActive(currentUserId, (err, isActive) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!isActive) return res.status(403).json({ error: 'You are not allowed to perform this action' });

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No users selected' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM users WHERE id IN (${placeholders})`;
    db.query(query, ids, (err) => {
      if (err) {
        console.error('Delete error:', err);
        return res.status(500).json({ error: 'Failed to delete users' });
      }
      res.json({ message: 'Users deleted successfully' });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
