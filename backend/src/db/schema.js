const { run } = require('../config/database');

async function createTables(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      grade TEXT,
      direction TEXT,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      status TEXT DEFAULT 'available',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS missions_unified (
      id SERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      mission_type TEXT NOT NULL,
      objective TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      departure_city TEXT,
      transport_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      total_distance_km NUMERIC DEFAULT 0,
      duration_days INTEGER DEFAULT 0,
      fuel_estimate NUMERIC DEFAULT 0,
      per_diem_total NUMERIC DEFAULT 0,
      mission_fees NUMERIC DEFAULT 0,
      created_by INTEGER NOT NULL REFERENCES users(id),
      validation_history TEXT DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    // Migration pour ajouter mission_fees si la table existe déjà
    `ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS mission_fees NUMERIC DEFAULT 0;`,
    `CREATE TABLE IF NOT EXISTS mission_destinations (
      id SERIAL PRIMARY KEY,
      mission_id INTEGER NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
      city TEXT NOT NULL,
      distance_km NUMERIC NOT NULL,
      order_index INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS mission_participants (
      id SERIAL PRIMARY KEY,
      mission_id INTEGER NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
      participant_type TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      first_name TEXT,
      last_name TEXT,
      nni TEXT,
      profession TEXT,
      ministry TEXT,
      grade TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS mission_documents (
      id SERIAL PRIMARY KEY,
      mission_id INTEGER NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      title TEXT,
      language TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      checksum TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      registration TEXT UNIQUE NOT NULL,
      fuel_type TEXT,
      status TEXT DEFAULT 'available'
    );`,
    `CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      status TEXT DEFAULT 'available'
    );`,
    `CREATE TABLE IF NOT EXISTS logistics_assignments (
      id SERIAL PRIMARY KEY,
      mission_id INTEGER UNIQUE NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
      vehicle_id INTEGER REFERENCES vehicles(id),
      driver_id INTEGER REFERENCES drivers(id),
      fuel_amount NUMERIC,
      lodging_details TEXT,
      tickets_details TEXT,
      local_transport TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mission_id INTEGER REFERENCES missions_unified(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT,
      link TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      mission_id INTEGER NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      status_from TEXT,
      status_to TEXT,
      comment TEXT,
      role_code TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`
  ];

  for (const sql of statements) {
    await run(db, sql);
  }
}

module.exports = { createTables };
