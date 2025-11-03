const { connect, run, get } = require('../config/database');
const auditService = require('./auditService');
const workflowService = require('./workflowService');

const FUEL_CONSUMPTION_L_PER_KM = 0.08;

async function ensureResourceAvailability(db, table, id, allowedStatuses, currentId) {
  if (!id) {
    return null;
  }
  const row = await get(db, `SELECT id, status FROM ${table} WHERE id = ?`, [id]);
  if (!row) {
    throw new Error(`${table === 'vehicles' ? 'Véhicule' : 'Chauffeur'} introuvable`);
  }
  if (!allowedStatuses.includes(row.status) && row.id !== currentId) {
    throw new Error(`${table === 'vehicles' ? 'Véhicule' : 'Chauffeur'} déjà affecté à une autre mission`);
  }
  return row;
}

async function assignLogistics(missionId, payload, user) {
  const db = await connect();
  try {
    await run(db, 'BEGIN');
    const mission = await get(
      db,
      'SELECT id, mission_type, status, total_distance_km, validation_history FROM missions_unified WHERE id = ?',
      [missionId]
    );
    if (!mission) {
      throw new Error('Mission introuvable');
    }
    if (mission.status !== 'pending_logistics') {
      throw new Error("La mission n'est pas en attente d'affectation logistique");
    }

    if (mission.mission_type === 'terrestre' && !payload?.vehicle_id) {
      throw new Error('Un véhicule est requis pour une mission terrestre');
    }
    if (mission.mission_type === 'terrestre' && !payload?.driver_id) {
      throw new Error('Un chauffeur est requis pour une mission terrestre');
    }
    if (mission.mission_type === 'aerienne' && !payload?.tickets_details) {
      throw new Error('Les informations billet sont obligatoires pour une mission aérienne');
    }

    const existing = await get(db, 'SELECT * FROM logistics_assignments WHERE mission_id = ?', [missionId]);

    const vehicleRow = await ensureResourceAvailability(
      db,
      'vehicles',
      payload.vehicle_id,
      ['available'],
      existing?.vehicle_id
    );
    const driverRow = await ensureResourceAvailability(
      db,
      'drivers',
      payload.driver_id,
      ['available'],
      existing?.driver_id
    );

    if (existing?.vehicle_id && existing.vehicle_id !== payload.vehicle_id) {
      await run(db, 'UPDATE vehicles SET status = ? WHERE id = ?', ['available', existing.vehicle_id]);
    }
    if (existing?.driver_id && existing.driver_id !== payload.driver_id) {
      await run(db, 'UPDATE drivers SET status = ? WHERE id = ?', ['available', existing.driver_id]);
    }

    const autoFuel = mission.mission_type === 'terrestre'
      ? Number(((mission.total_distance_km || 0) * FUEL_CONSUMPTION_L_PER_KM).toFixed(2))
      : 0;
    const fuelAmount = payload.fuel_amount !== undefined && payload.fuel_amount !== null
      ? Number(payload.fuel_amount)
      : autoFuel;

    if (existing) {
      await run(
        db,
        `UPDATE logistics_assignments
         SET vehicle_id = ?, driver_id = ?, fuel_amount = ?, lodging_details = ?, tickets_details = ?, local_transport = ?, notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE mission_id = ?` ,
        [
          payload.vehicle_id || null,
          payload.driver_id || null,
          fuelAmount,
          payload.lodging_details || null,
          payload.tickets_details || null,
          payload.local_transport || null,
          payload.notes || null,
          missionId
        ]
      );
    } else {
      await run(
        db,
        `INSERT INTO logistics_assignments (
          mission_id, vehicle_id, driver_id, fuel_amount, lodging_details, tickets_details, local_transport, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          missionId,
          payload.vehicle_id || null,
          payload.driver_id || null,
          fuelAmount,
          payload.lodging_details || null,
          payload.tickets_details || null,
          payload.local_transport || null,
          payload.notes || null
        ]
      );
    }

    if (payload.vehicle_id && vehicleRow?.status !== 'maintenance') {
      await run(db, 'UPDATE vehicles SET status = ? WHERE id = ?', ['in_use', payload.vehicle_id]);
    }
    if (payload.driver_id) {
      await run(db, 'UPDATE drivers SET status = ? WHERE id = ?', ['in_mission', payload.driver_id]);
    }

    await auditService.log(db, {
      missionId,
      userId: user.id,
      roleCode: user.roleCode,
      action: 'logistics_assigned',
      statusFrom: mission.status,
      statusTo: 'pending_finance',
      comment: payload.notes || ''
    });

    await workflowService.advanceToNext(
      missionId,
      'pending_finance',
      payload.notes,
      user,
      { db, historyAction: 'logistics_assigned' }
    );

    await run(db, 'COMMIT');
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

module.exports = { assignLogistics };
