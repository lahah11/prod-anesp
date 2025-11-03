const { connect, run, all, get } = require('../config/database');
const { sendEmail } = require('../utils/mailer');

async function createNotification(db, { userId, missionId, title, body, type, link }) {
  await run(
    db,
    `INSERT INTO notifications (user_id, mission_id, title, body, type, link)
     VALUES (?, ?, ?, ?, ?, ?)` ,
    [userId, missionId || null, title, body, type || null, link || null]
  );
}

async function notifyRole(db, roleCode, { missionId, title, body, type, link, attachments }) {
  const role = await get(db, 'SELECT id FROM roles WHERE code = ?', [roleCode]);
  if (!role) return;
  const users = await all(db, 'SELECT id, email FROM users WHERE role_id = ?', [role.id]);
  for (const user of users) {
    await createNotification(db, {
      userId: user.id,
      missionId,
      title,
      body,
      type,
      link
    });
    if (user.email) {
      await sendEmail({ 
        to: user.email, 
        subject: title, 
        html: `<p>${body}</p>`,
        attachments
      });
    }
  }
}

async function fetchNotifications(userId) {
  const db = await connect();
  try {
    return await all(
      db,
      `SELECT notifications.*, missions_unified.reference
       FROM notifications
       LEFT JOIN missions_unified ON missions_unified.id = notifications.mission_id
       WHERE notifications.user_id = ?
       ORDER BY notifications.created_at DESC`,
      [userId]
    );
  } finally {
    db.release();
  }
}

async function notifyUsers(db, userIds, { missionId, title, body, type, link, attachments }) {
  if (!userIds?.length) {
    return;
  }
  const placeholders = userIds.map(() => '?').join(',');
  const rows = await all(db, `SELECT id, email FROM users WHERE id IN (${placeholders})`, userIds);
  for (const row of rows) {
    await createNotification(db, {
      userId: row.id,
      missionId,
      title,
      body,
      type,
      link
    });
    if (row.email) {
      await sendEmail({ 
        to: row.email, 
        subject: title, 
        html: `<p>${body}</p>`,
        attachments
      });
    }
  }
}

module.exports = { notifyRole, notifyUsers, fetchNotifications };
