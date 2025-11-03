const { connect, run, get, all } = require('../config/database');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const documentService = require('./documentService');

const TRANSITIONS = {
  pending_technical_validation: 'pending_logistics',
  pending_logistics: 'pending_finance',
  pending_finance: 'pending_dg',
  pending_dg: 'approved'
};

const NEXT_STEP_ROLE = {
  pending_logistics: 'moyens_generaux',
  pending_finance: 'daf',
  pending_dg: 'dg'
};

function buildHistoryEntry({ status, action, user, role, comment }) {
  return {
    status,
    action,
    user,
    role,
    comment: comment || '',
    at: new Date().toISOString()
  };
}

async function pushHistory(db, mission, nextStatus, user, comment, action) {
  const history = mission.validation_history ? JSON.parse(mission.validation_history) : [];
  history.push(
    buildHistoryEntry({
      status: nextStatus,
      action: action || 'status_changed',
      user: `${user.firstName} ${user.lastName}`,
      role: user.roleCode,
      comment
    })
  );
  await run(
    db,
    'UPDATE missions_unified SET validation_history = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(history), nextStatus, mission.id]
  );
}

async function notifyNextStep(db, mission, nextStatus) {
  const link = `/missions/${mission.id}`;
  if (nextStatus === 'approved') {
    await notificationService.notifyUsers(db, [mission.created_by], {
      missionId: mission.id,
      title: `Mission ${mission.reference} approuvée`,
      body: 'La direction générale a validé la mission.',
      type: 'workflow',
      link
    });
    return;
  }
  const targetRole = NEXT_STEP_ROLE[nextStatus];
  if (targetRole) {
    await notificationService.notifyRole(db, targetRole, {
      missionId: mission.id,
      title: `Mission ${mission.reference}`,
      body: 'Une action est requise sur la mission.',
      type: 'workflow',
      link
    });
  }
}

async function advanceToNext(missionId, nextStatus, comment, user, options = {}) {
  if (!comment && nextStatus === 'pending_logistics') {
    comment = '';
  }
  const externalDb = options.db;
  const db = externalDb || (await connect());
  const shouldRelease = !externalDb;
  try {
    const mission = await get(
      db,
      `SELECT missions_unified.*, users.email AS creator_email
       FROM missions_unified
       JOIN users ON users.id = missions_unified.created_by
       WHERE missions_unified.id = ?`,
      [missionId]
    );
    if (!mission) {
      throw new Error('Mission introuvable');
    }
    const expectedNext = TRANSITIONS[mission.status];
    if (expectedNext !== nextStatus) {
      throw new Error('Transition de statut invalide');
    }
    await pushHistory(db, mission, nextStatus, user, comment, options.historyAction);
    await auditService.log(db, {
      missionId,
      userId: user.id,
      roleCode: user.roleCode,
      action: options.historyAction || 'status_changed',
      statusFrom: mission.status,
      statusTo: nextStatus,
      comment: comment || ''
    });
    try {
      await notifyNextStep(db, mission, nextStatus);
    } catch (error) {
      console.error('Notification workflow error', error);
    }
    if (nextStatus === 'approved') {
      try {
        await documentService.generateMissionDocuments(db, missionId, user);
      } catch (error) {
        console.error('Document generation error', error);
      }
    }
  } finally {
    if (shouldRelease) {
      db.release();
    }
  }
}

async function rejectMission(missionId, comment, user, options = {}) {
  if (!comment) {
    throw new Error('Un motif est obligatoire pour un rejet');
  }
  const externalDb = options.db;
  const db = externalDb || (await connect());
  const shouldRelease = !externalDb;
  try {
    const mission = await get(
      db,
      `SELECT id, status, reference, created_by, validation_history FROM missions_unified WHERE id = ?`,
      [missionId]
    );
    if (!mission) {
      throw new Error('Mission introuvable');
    }
    const history = mission.validation_history ? JSON.parse(mission.validation_history) : [];
    history.push(
      buildHistoryEntry({
        status: 'rejected',
        action: 'mission_rejected',
        user: `${user.firstName} ${user.lastName}`,
        role: user.roleCode,
        comment
      })
    );
    await run(
      db,
      'UPDATE missions_unified SET status = ?, validation_history = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['rejected', JSON.stringify(history), mission.id]
    );
    const assignment = await get(
      db,
      'SELECT vehicle_id, driver_id FROM logistics_assignments WHERE mission_id = ?',
      [missionId]
    );
    if (assignment) {
      if (assignment.vehicle_id) {
        await run(db, 'UPDATE vehicles SET status = ? WHERE id = ?', ['available', assignment.vehicle_id]);
      }
      if (assignment.driver_id) {
        await run(db, 'UPDATE drivers SET status = ? WHERE id = ?', ['available', assignment.driver_id]);
      }
      await run(db, 'DELETE FROM logistics_assignments WHERE mission_id = ?', [missionId]);
    }
    await auditService.log(db, {
      missionId,
      userId: user.id,
      roleCode: user.roleCode,
      action: 'mission_rejected',
      statusFrom: mission.status,
      statusTo: 'rejected',
      comment
    });
    const participants = await all(
      db,
      'SELECT user_id FROM mission_participants WHERE mission_id = ? AND participant_type = \"internal\"',
      [missionId]
    );
    for (const participant of participants) {
      if (participant.user_id) {
        await run(db, 'UPDATE users SET status = ? WHERE id = ?', ['available', participant.user_id]);
      }
    }
    try {
      await notificationService.notifyUsers(db, [mission.created_by], {
        missionId,
        title: `Mission ${mission.reference} rejetée`,
        body: comment,
        type: 'workflow',
        link: `/missions/${missionId}`
      });
    } catch (error) {
      console.error('Notification rejection error', error);
    }
  } finally {
    if (shouldRelease) {
      db.release();
    }
  }
}

module.exports = { advanceToNext, rejectMission };
