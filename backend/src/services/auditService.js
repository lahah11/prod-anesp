const { run } = require('../config/database');

async function log(db, { missionId, userId, roleCode, action, statusFrom, statusTo, comment }) {
  await run(
    db,
    `INSERT INTO audit_logs (mission_id, user_id, role_code, action, status_from, status_to, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [missionId, userId, roleCode || null, action, statusFrom || null, statusTo || null, comment || null]
  );
}

module.exports = { log };
