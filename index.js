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

// Block users
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

// Unblock users
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

// Delete users
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
