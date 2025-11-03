const { connect, all, run, get } = require('../config/database');

async function listVehicles() {
  const db = await connect();
  try {
    return await all(db, "SELECT * FROM vehicles WHERE status IN ('available', 'maintenance') ORDER BY label");
  } finally {
    db.release();
  }
}

async function listDrivers() {
  const db = await connect();
  try {
    return await all(db, "SELECT * FROM drivers WHERE status = 'available' ORDER BY last_name");
  } finally {
    db.release();
  }
}

async function createVehicle(payload) {
  const db = await connect();
  try {
    const result = await run(
      db,
      'INSERT INTO vehicles (label, registration, fuel_type, status) VALUES (?, ?, ?, ?) RETURNING id',
      [payload.label, payload.registration, payload.fuel_type || '', payload.status || 'available']
    );
    return { id: result.lastID };
  } finally {
    db.release();
  }
}

async function createDriver(payload) {
  const db = await connect();
  try {
    const result = await run(
      db,
      'INSERT INTO drivers (first_name, last_name, phone, status) VALUES (?, ?, ?, ?) RETURNING id',
      [payload.first_name, payload.last_name, payload.phone || '', payload.status || 'available']
    );
    return { id: result.lastID };
  } finally {
    db.release();
  }
}

module.exports = { listVehicles, listDrivers, createVehicle, createDriver };
