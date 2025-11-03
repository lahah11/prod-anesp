const bcrypt = require('bcryptjs');
const { connect, all, run, get } = require('../config/database');

async function listUsers({ page = 1, pageSize = 20, search, direction, grade, status }) {
  const db = await connect();
  try {
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const sizeNumber = Number(pageSize) > 0 ? Number(pageSize) : 20;
    const where = [];
    const params = [];
    if (search) {
      where.push('(first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (direction) {
      where.push('direction = ?');
      params.push(direction);
    }
    if (grade) {
      where.push('grade = ?');
      params.push(grade);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (pageNumber - 1) * sizeNumber;
    const rows = await all(
      db,
      `SELECT users.*, roles.code as role_code
       FROM users
       JOIN roles ON roles.id = users.role_id
       ${whereSql}
       ORDER BY users.last_name ASC
       LIMIT ? OFFSET ?`,
      [...params, sizeNumber, offset]
    );
    const total = await get(
      db,
      `SELECT COUNT(*) as count FROM users ${whereSql}`,
      params
    );
    return { data: rows, total: Number(total?.count || 0) };
  } finally {
    db.release();
  }
}

async function createUser(payload) {
  const db = await connect();
  try {
    const role = await get(db, 'SELECT id FROM roles WHERE code = ?', [payload.role]);
    if (!role) throw new Error('Role invalide');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password || 'Password123!', salt);
    const result = await run(
      db,
      `INSERT INTO users (first_name, last_name, email, password_hash, grade, direction, role_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id` ,
      [
        payload.first_name,
        payload.last_name,
        payload.email,
        passwordHash,
        payload.grade,
        payload.direction,
        role.id,
        payload.status || 'available'
      ]
    );
    return { id: result.lastID };
  } finally {
    db.release();
  }
}

async function updateUser(id, payload) {
  const db = await connect();
  try {
    const fields = ['first_name', 'last_name', 'email', 'grade', 'direction', 'status'];
    const sets = [];
    const params = [];
    for (const field of fields) {
      if (payload[field] !== undefined) {
        sets.push(`${field} = ?`);
        params.push(payload[field]);
      }
    }
    if (payload.role) {
      const role = await get(db, 'SELECT id FROM roles WHERE code = ?', [payload.role]);
      if (!role) throw new Error('Role invalide');
      sets.push('role_id = ?');
      params.push(role.id);
    }
    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(payload.password, salt);
      sets.push('password_hash = ?');
      params.push(passwordHash);
    }
    if (!sets.length) return;
    params.push(id);
    await run(db, `UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
  } finally {
    db.release();
  }
}

module.exports = { listUsers, createUser, updateUser };
