const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connect, get, all } = require('../config/database');
const env = require('../config/env');

async function login(req, res) {
  const { email, password } = req.body;
  const db = await connect();
  try {
    const user = await get(
      db,
      `SELECT users.*, roles.code as role_code
       FROM users
       JOIN roles ON roles.id = users.role_id
       WHERE email = ?`,
      [email]
    );
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const permissionRows = await all(
      db,
      `SELECT permissions.code
       FROM permissions
       JOIN role_permissions ON role_permissions.permission_id = permissions.id
       WHERE role_permissions.role_id = ?
       ORDER BY permissions.code ASC`,
      [user.role_id]
    );
    const permissions = permissionRows.map((row) => row.code);

    const token = jwt.sign({ sub: user.id, role: user.role_code }, env.JWT_SECRET, { expiresIn: '12h' });
    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role_code,
        permissions
      }
    });
  } finally {
    db.release();
  }
}

module.exports = { login };
