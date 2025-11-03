const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let hasPgMem = true;
try {
  require.resolve('pg-mem');
} catch (error) {
  hasPgMem = false;
}

if (!hasPgMem) {
  test.skip('pg-mem not installed - skipping workflow integration tests');
  module.exports = {};
  return;
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'http://localhost:3000';
}
process.env.DB_EMULATOR = 'pg-mem';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anesp-e2e-'));
process.env.STORAGE_ROOT = path.join(tempRoot, 'storage');

const { initialize } = require('../src/app');
const { connect, get, all, closePool } = require('../src/config/database');
const missionService = require('../src/services/missionService');
const workflowService = require('../src/services/workflowService');
const logisticsService = require('../src/services/logisticsService');

async function resetDatabase() {
  if (fs.existsSync(process.env.STORAGE_ROOT)) {
    fs.rmSync(process.env.STORAGE_ROOT, { recursive: true, force: true });
  }
  await closePool();
  await initialize();
}

async function fetchUser(email) {
  const db = await connect();
  try {
    const row = await get(
      db,
      `SELECT users.id, users.first_name, users.last_name, users.role_id, roles.code AS role_code
       FROM users
       JOIN roles ON roles.id = users.role_id
       WHERE users.email = ?`,
      [email]
    );
    if (!row) {
      throw new Error(`User ${email} not found`);
    }
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      roleId: row.role_id,
      roleCode: row.role_code
    };
  } finally {
    db.release();
  }
}

async function fetchFirst(table) {
  const db = await connect();
  try {
    const row = await get(db, `SELECT * FROM ${table} ORDER BY id ASC LIMIT 1`);
    if (!row) {
      throw new Error(`${table} empty`);
    }
    return row;
  } finally {
    db.release();
  }
}

function missionPayload(participantId) {
  return {
    title: 'Inspection chantier',
    objective: 'Vérifier l’avancement des travaux',
    mission_type: 'terrestre',
    transport_mode: 'Véhicule ANESP',
    start_date: '2025-01-10',
    end_date: '2025-01-12',
    departure_city: 'Nouakchott',
    destinations: [
      { city: 'Nouadhibou', distance_km: 470 },
      { city: 'Atar', distance_km: 445 }
    ],
    participants: [
      { participant_type: 'internal', user_id: participantId },
      {
        participant_type: 'external',
        first_name: 'Ali',
        last_name: 'Salem',
        nni: '123456789',
        profession: 'Consultant',
        ministry: 'Équipement',
        grade: 'B'
      }
    ]
  };
}

beforeEach(async () => {
  await resetDatabase();
});

after(async () => {
  await closePool();
});

test('full workflow from creation to DG approval generates bilingual documents', async () => {
  const engineer = await fetchUser('engineer@anesp.gov');
  const technique = await fetchUser('tech@anesp.gov');
  const moyensGeneraux = await fetchUser('mg@anesp.gov');
  const daf = await fetchUser('daf@anesp.gov');
  const dg = await fetchUser('dg@anesp.gov');

  const mission = await missionService.createMission(missionPayload(technique.id), engineer);
  assert.equal(mission.status, 'pending_technical_validation');

  await workflowService.advanceToNext(mission.id, 'pending_logistics', 'Conforme', technique);

  const vehicle = await fetchFirst('vehicles');
  const driver = await fetchFirst('drivers');
  await logisticsService.assignLogistics(
    mission.id,
    {
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      lodging_details: 'Hotel Tfeila',
      notes: 'Prévoir carburant supplémentaire'
    },
    moyensGeneraux
  );

  await workflowService.advanceToNext(mission.id, 'pending_dg', 'Budget validé', daf);
  await workflowService.advanceToNext(mission.id, 'approved', 'Mission approuvée', dg);

  const db = await connect();
  try {
    const storedMission = await get(db, 'SELECT status FROM missions_unified WHERE id = ?', [mission.id]);
    assert.equal(storedMission.status, 'approved');
    const documents = await all(db, 'SELECT document_type, language, file_path FROM mission_documents WHERE mission_id = ?', [
      mission.id
    ]);
    assert.equal(documents.length, 14);
    const languages = new Set(documents.map((doc) => doc.language));
    assert.deepEqual(new Set(languages), new Set(['fr', 'ar']));
    for (const document of documents) {
      const absolute = path.join(process.env.STORAGE_ROOT, 'documents', document.file_path);
      assert.ok(fs.existsSync(absolute), `missing file ${absolute}`);
    }
  } finally {
    db.release();
  }
});

test('rejection frees resources and resets participants', async () => {
  const engineer = await fetchUser('engineer@anesp.gov');
  const technique = await fetchUser('tech@anesp.gov');
  const moyensGeneraux = await fetchUser('mg@anesp.gov');
  const daf = await fetchUser('daf@anesp.gov');

  const mission = await missionService.createMission(missionPayload(technique.id), engineer);
  await workflowService.advanceToNext(mission.id, 'pending_logistics', 'Conforme', technique);

  const vehicle = await fetchFirst('vehicles');
  const driver = await fetchFirst('drivers');
  await logisticsService.assignLogistics(
    mission.id,
    {
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      lodging_details: 'Hotel',
      notes: 'Affectation initiale'
    },
    moyensGeneraux
  );

  await workflowService.rejectMission(mission.id, 'Budget insuffisant', daf);

  const db = await connect();
  try {
    const statusRow = await get(db, 'SELECT status FROM missions_unified WHERE id = ?', [mission.id]);
    assert.equal(statusRow.status, 'rejected');
    const assignment = await get(db, 'SELECT * FROM logistics_assignments WHERE mission_id = ?', [mission.id]);
    assert.equal(assignment, undefined);
    const vehicleRow = await get(db, 'SELECT status FROM vehicles WHERE id = ?', [vehicle.id]);
    assert.equal(vehicleRow.status, 'available');
    const driverRow = await get(db, 'SELECT status FROM drivers WHERE id = ?', [driver.id]);
    assert.equal(driverRow.status, 'available');
    const participantStatus = await get(db, 'SELECT status FROM users WHERE id = ?', [technique.id]);
    assert.equal(participantStatus.status, 'available');
  } finally {
    db.release();
  }
});

test('logistics assignment enforces mandatory vehicle and driver for terrestrial missions', async () => {
  const engineer = await fetchUser('engineer@anesp.gov');
  const technique = await fetchUser('tech@anesp.gov');
  const moyensGeneraux = await fetchUser('mg@anesp.gov');

  const mission = await missionService.createMission(missionPayload(technique.id), engineer);
  await workflowService.advanceToNext(mission.id, 'pending_logistics', 'Conforme', technique);

  await assert.rejects(
    () =>
      logisticsService.assignLogistics(
        mission.id,
        {
          lodging_details: 'Hotel',
          notes: 'Tentative invalide'
        },
        moyensGeneraux
      ),
    { message: 'Un véhicule est requis pour une mission terrestre' }
  );
});
