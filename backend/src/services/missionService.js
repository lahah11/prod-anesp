const moment = require('moment');
const { connect, run, get, all } = require('../config/database');
const { generateMissionReference } = require('../utils/reference');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

const FUEL_CONSUMPTION_L_PER_KM = 0.08;
const DEFAULT_EXTERNAL_PER_DIEM = 1800;

function normaliseGrade(grade) {
  if (!grade) return '';
  return String(grade).trim().toUpperCase();
}

function gradePerDiem(grade) {
  const normalized = normaliseGrade(grade);
  if (!normalized) {
    return 1500;
  }
  if (normalized.startsWith('A')) {
    return 3500;
  }
  if (normalized.startsWith('B')) {
    return 3000;
  }
  if (normalized.startsWith('C')) {
    return 2500;
  }
  if (normalized.startsWith('D')) {
    return 2000;
  }
  return 1500;
}

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

async function computePerDiemTotal(db, participants, durationDays) {
  if (!participants?.length || !durationDays) {
    return 0;
  }
  const internalIds = [
    ...new Set(
      participants
        .filter((participant) => participant.participant_type === 'internal' && participant.user_id)
        .map((participant) => participant.user_id)
    )
  ];
  const internalInfo = {};
  if (internalIds.length) {
    const placeholders = internalIds.map(() => '?').join(',');
    const rows = await all(
      db,
      `SELECT id, grade FROM users WHERE id IN (${placeholders})`,
      internalIds
    );
    for (const row of rows) {
      internalInfo[row.id] = row;
    }
  }

  let total = 0;
  for (const participant of participants) {
    if (participant.participant_type === 'internal') {
      const userRow = internalInfo[participant.user_id];
      total += gradePerDiem(userRow?.grade) * durationDays;
    } else {
      total += gradePerDiem(participant.grade) * durationDays || DEFAULT_EXTERNAL_PER_DIEM * durationDays;
    }
  }
  return Number(total.toFixed(2));
}

async function createMission(payload, user) {
  const db = await connect();
  try {
    await run(db, 'BEGIN');

    const start = moment(payload.start_date, 'YYYY-MM-DD', true);
    const end = moment(payload.end_date, 'YYYY-MM-DD', true);
    if (!start.isValid() || !end.isValid()) {
      throw new Error('Dates de mission invalides');
    }
    if (end.isBefore(start)) {
      throw new Error('La date de retour doit être postérieure à la date de départ');
    }
    const durationDays = end.diff(start, 'days') + 1;
    const totalDistance = (payload.destinations || []).reduce(
      (accumulator, destination) => accumulator + Number(destination.distance_km || destination.distance || 0),
      0
    );
    const fuelEstimate = payload.mission_type === 'terrestre'
      ? Number((totalDistance * FUEL_CONSUMPTION_L_PER_KM).toFixed(2))
      : 0;
    const year = start.year();
    const countForYear = await get(
      db,
      `SELECT COUNT(*) as count
       FROM missions_unified
       WHERE EXTRACT(YEAR FROM created_at) = ?`,
      [Number(year)]
    );
    const yearlyCount = Number(countForYear?.count || 0);
    const reference = generateMissionReference(year, yearlyCount + 1);

    const history = [
      buildHistoryEntry({
        status: 'pending_technical_validation',
        action: 'mission_submitted',
        user: `${user.firstName} ${user.lastName}`,
        role: user.roleCode,
        comment: payload.objective
      })
    ];

    const insertResult = await run(
      db,
      `INSERT INTO missions_unified (
        reference, title, mission_type, objective, start_date, end_date,
        departure_city, transport_mode, status, total_distance_km,
        duration_days, fuel_estimate, per_diem_total, mission_fees, created_by, validation_history
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id` ,
      [
        reference,
        payload.title,
        payload.mission_type,
        payload.objective,
        payload.start_date,
        payload.end_date,
        payload.departure_city || payload.departureCity || '',
        payload.transport_mode,
        'pending_technical_validation',
        Number(totalDistance.toFixed(2)),
        durationDays,
        fuelEstimate,
        0,
        Number(payload.mission_fees || 0),
        user.id,
        JSON.stringify(history)
      ]
    );
    const missionId = insertResult.lastID;

    for (const [index, destination] of (payload.destinations || []).entries()) {
      if (!destination.city) continue;
      await run(
        db,
        `INSERT INTO mission_destinations (mission_id, city, distance_km, order_index)
         VALUES (?, ?, ?, ?)` ,
        [missionId, destination.city, Number(destination.distance_km || destination.distance || 0), index]
      );
    }

    for (const participant of payload.participants || []) {
      if (participant.participant_type === 'internal') {
        if (!participant.user_id) {
          continue;
        }
        await run(
          db,
          `INSERT INTO mission_participants (mission_id, participant_type, user_id)
           VALUES (?, 'internal', ?)` ,
          [missionId, participant.user_id]
        );
        await run(db, 'UPDATE users SET status = ? WHERE id = ?', ['on_mission', participant.user_id]);
      } else {
        await run(
          db,
          `INSERT INTO mission_participants (
            mission_id, participant_type, first_name, last_name, nni, profession, ministry, grade
          ) VALUES (?, 'external', ?, ?, ?, ?, ?, ?)` ,
          [
            missionId,
            participant.first_name || '',
            participant.last_name || '',
            participant.nni || '',
            participant.profession || '',
            participant.ministry || '',
            participant.grade || ''
          ]
        );
      }
    }

    const perDiemTotal = await computePerDiemTotal(db, payload.participants || [], durationDays);
    await run(
      db,
      `UPDATE missions_unified
       SET per_diem_total = ?, fuel_estimate = ?, total_distance_km = ?, duration_days = ?
       WHERE id = ?` ,
      [Number(perDiemTotal.toFixed(2)), fuelEstimate, Number(totalDistance.toFixed(2)), durationDays, missionId]
    );

    await auditService.log(db, {
      missionId,
      userId: user.id,
      roleCode: user.roleCode,
      action: 'mission_created',
      statusTo: 'pending_technical_validation',
      comment: payload.objective || ''
    });

    await run(db, 'COMMIT');

    try {
      await notificationService.notifyRole(db, 'technique', {
        missionId,
        title: 'Nouvelle mission à valider',
        body: `${user.firstName} ${user.lastName} a soumis la mission ${reference}`,
        type: 'workflow',
        link: `/missions/${missionId}`
      });
    } catch (error) {
      console.error('Notification error', error);
    }

    return {
      id: missionId,
      reference,
      status: 'pending_technical_validation',
      fuel_estimate: fuelEstimate,
      per_diem_total: Number(perDiemTotal.toFixed(2))
    };
  } catch (error) {
    try {
      await run(db, 'ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error', rollbackError);
    }
    throw error;
  } finally {
    db.release();
  }
}

async function listMissions(user, filters = {}) {
  const db = await connect();
  try {
    const conditions = [];
    const params = [];
    if (filters.status) {
      conditions.push('missions_unified.status = ?');
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push('(missions_unified.reference ILIKE ? OR missions_unified.title ILIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await all(
      db,
      `SELECT missions_unified.*, users.first_name || ' ' || users.last_name AS created_by_name
       FROM missions_unified
       JOIN users ON users.id = missions_unified.created_by
       ${whereSql}
       ORDER BY missions_unified.created_at DESC`,
      params
    );
    return rows.map((row) => ({
      ...row,
      validation_history: row.validation_history ? JSON.parse(row.validation_history) : []
    }));
  } finally {
    db.release();
  }
}

async function getMissionById(missionId) {
  const db = await connect();
  try {
    const mission = await get(db, 'SELECT * FROM missions_unified WHERE id = ?', [missionId]);
    if (!mission) {
      return null;
    }
    mission.validation_history = mission.validation_history ? JSON.parse(mission.validation_history) : [];
    mission.destinations = await all(
      db,
      'SELECT * FROM mission_destinations WHERE mission_id = ? ORDER BY order_index ASC',
      [missionId]
    );
    mission.participants = await all(
      db,
      `SELECT mission_participants.*, users.first_name || ' ' || users.last_name AS internal_name,
              users.email AS internal_email, users.grade AS internal_grade
       FROM mission_participants
       LEFT JOIN users ON users.id = mission_participants.user_id
       WHERE mission_participants.mission_id = ?`,
      [missionId]
    );
    mission.documents = await all(
      db,
      'SELECT id, document_type, title, language, file_path, mime_type, file_size, checksum, created_at FROM mission_documents WHERE mission_id = ? ORDER BY created_at DESC',
      [missionId]
    );
    mission.logistics = await get(
      db,
      `SELECT logistics_assignments.*, vehicles.label AS vehicle_label, vehicles.registration,
              drivers.first_name AS driver_first_name, drivers.last_name AS driver_last_name
       FROM logistics_assignments
       LEFT JOIN vehicles ON vehicles.id = logistics_assignments.vehicle_id
       LEFT JOIN drivers ON drivers.id = logistics_assignments.driver_id
       WHERE logistics_assignments.mission_id = ?`,
      [missionId]
    );
    mission.audit = await all(
      db,
      `SELECT audit_logs.*, users.first_name || ' ' || users.last_name AS actor_name, roles.code AS actor_role
       FROM audit_logs
       JOIN users ON users.id = audit_logs.user_id
       JOIN roles ON roles.id = users.role_id
       WHERE audit_logs.mission_id = ?
       ORDER BY audit_logs.created_at ASC`,
      [missionId]
    );
    return mission;
  } finally {
    db.release();
  }
}

async function listAvailableAgents() {
  const db = await connect();
  try {
    return await all(
      db,
      `SELECT users.id, users.first_name, users.last_name, users.status, users.grade, users.direction
       FROM users
       JOIN roles ON roles.id = users.role_id
       WHERE users.status = 'available' AND roles.code IN ('ingenieur', 'technique', 'moyens_generaux', 'daf', 'dg', 'rh')
       ORDER BY users.last_name ASC`
    );
  } finally {
    db.release();
  }
}

module.exports = {
  createMission,
  listMissions,
  getMissionById,
  listAvailableAgents
};
