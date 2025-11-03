const jwt = require('jsonwebtoken');
const { get, connect, all } = require('../config/database');
const env = require('../config/env');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }
  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const db = await connect();
    let user;
    let permissions = [];
    try {
      user = await get(
        db,
        `SELECT users.*, roles.code as role_code
         FROM users
         JOIN roles ON roles.id = users.role_id
         WHERE users.id = ?`,
        [payload.sub]
      );
      if (user) {
        const rows = await all(
          db,
          `SELECT permissions.code
           FROM permissions
           JOIN role_permissions ON role_permissions.permission_id = permissions.id
           WHERE role_permissions.role_id = ?
           ORDER BY permissions.code ASC`,
          [user.role_id]
        );
        permissions = rows.map((row) => row.code);
      }
    } finally {
      db.release();
    }
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: user.role_id,
      roleCode: user.role_code,
      permissions
    };
    next();
  } catch (err) {
    console.error('Auth error', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;
