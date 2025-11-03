const { connect, run, get, all } = require('../config/database');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const documentService = require('./documentService');

const TRANSITIONS = {
  pending_technical_validation: 'pending_logistics',
  pending_logistics: 'pending_finance',
  pending_finance: 'pending_dg',
  pending_dg: 'approved',
  approved: 'pending_archive_validation',
  pending_archive_validation: 'archived'
};

const NEXT_STEP_ROLE = {
  pending_logistics: 'moyens_generaux',
  pending_finance: 'daf',
  pending_dg: 'dg',
  pending_archive_validation: 'moyens_generaux'
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
      body: 'La direction générale a validé la mission. Vous devez maintenant soumettre le rapport de mission et l’ordre de mission cacheté.',
      type: 'workflow',
      link
    });
    return;
  }
  if (nextStatus === 'pending_archive_validation') {
    await notificationService.notifyRole(db, 'moyens_generaux', {
      missionId: mission.id,
      title: `Mission ${mission.reference}`,
      body: 'Les documents justificatifs sont disponibles pour vérification.',
      type: 'workflow',
      link
    });
    return;
  }
  if (nextStatus === 'archived') {
    await notificationService.notifyUsers(db, [mission.created_by], {
      missionId: mission.id,
      title: `Mission ${mission.reference} archivée`,
      body: 'La mission est archivée et ne peut plus être modifiée.',
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
    if (nextStatus === 'archived') {
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
      }
      const participants = await all(
        db,
        'SELECT user_id FROM mission_participants WHERE mission_id = ? AND participant_type = "internal" AND user_id IS NOT NULL',
        [missionId]
      );
      for (const participant of participants) {
        await run(db, 'UPDATE users SET status = ? WHERE id = ?', ['available', participant.user_id]);
      }
    }
  } finally {
    if (shouldRelease) {
      db.release();
    }
  }
}

async function ensureDocumentsAdvance(db, missionId, user) {
  const mission = await get(db, 'SELECT id, status FROM missions_unified WHERE id = ?', [missionId]);
  if (!mission || mission.status !== 'approved') {
    return;
  }
  const docs = await all(
    db,
    `SELECT document_type FROM mission_documents WHERE mission_id = ? AND document_type IN ('mission_report', 'stamped_order')`,
    [missionId]
  );
  const types = new Set(docs.map((doc) => doc.document_type));
  if (types.has('mission_report') && types.has('stamped_order')) {
    await advanceToNext(missionId, 'pending_archive_validation', 'Documents justificatifs soumis', user, {
      db,
      historyAction: 'documents_submitted'
    });
  }
}

async function returnToDocumentSubmission(missionId, comment, user, options = {}) {
  if (!comment) {
    throw new Error('Un motif est obligatoire pour renvoyer la mission');
  }
  const externalDb = options.db;
  const db = externalDb || (await connect());
  const shouldRelease = !externalDb;
  try {
    const mission = await get(
      db,
      'SELECT id, status, reference, created_by, validation_history FROM missions_unified WHERE id = ?',
      [missionId]
    );
    if (!mission) {
      throw new Error('Mission introuvable');
    }
    if (mission.status !== 'pending_archive_validation') {
      throw new Error("La mission n'est pas en attente de validation des documents");
    }
    const history = mission.validation_history ? JSON.parse(mission.validation_history) : [];
    history.push(
      buildHistoryEntry({
        status: 'approved',
        action: 'documents_rejected',
        user: `${user.firstName} ${user.lastName}`,
        role: user.roleCode,
        comment
      })
    );
    await run(
      db,
      'UPDATE missions_unified SET validation_history = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(history), 'approved', mission.id]
    );
    await auditService.log(db, {
      missionId,
      userId: user.id,
      roleCode: user.roleCode,
      action: 'documents_rejected',
      statusFrom: 'pending_archive_validation',
      statusTo: 'approved',
      comment
    });
    try {
      await notificationService.notifyUsers(db, [mission.created_by], {
        missionId,
        title: `Mission ${mission.reference} — documents refusés`,
        body: comment,
        type: 'workflow',
        link: `/missions/${missionId}`
      });
    } catch (error) {
      console.error('Notification return to documents error', error);
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

module.exports = { advanceToNext, rejectMission, ensureDocumentsAdvance, returnToDocumentSubmission };
