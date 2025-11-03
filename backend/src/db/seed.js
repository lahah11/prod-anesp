const bcrypt = require('bcryptjs');
const { run, get, all } = require('../config/database');
async function ensureLogisticsResources(db) {
  const vehicles = [
    { label: 'Toyota Hilux', registration: 'AA-123-AA', fuel_type: 'diesel' },
    { label: 'Nissan Patrol', registration: 'BB-456-BB', fuel_type: 'diesel' },
    { label: 'Toyota Land Cruiser', registration: 'CC-789-CC', fuel_type: 'diesel' },
    { label: 'Mitsubishi Pajero', registration: 'DD-321-DD', fuel_type: 'diesel' },
    { label: 'Toyota Hilux Double Cab', registration: 'EE-654-EE', fuel_type: 'diesel' },
    { label: 'Nissan Navara', registration: 'FF-987-FF', fuel_type: 'diesel' },
    { label: 'Ford Ranger', registration: 'GG-147-GG', fuel_type: 'diesel' },
    { label: 'Isuzu D-Max', registration: 'HH-258-HH', fuel_type: 'diesel' },
    { label: 'Toyota Hiace', registration: 'II-369-II', fuel_type: 'diesel' },
    { label: 'Mercedes Sprinter', registration: 'JJ-741-JJ', fuel_type: 'diesel' },
    { label: 'Toyota Corolla', registration: 'KK-852-KK', fuel_type: 'essence' },
    { label: 'Nissan Sentra', registration: 'LL-963-LL', fuel_type: 'essence' }
  ];
  for (const vehicle of vehicles) {
    const existing = await get(db, 'SELECT id FROM vehicles WHERE registration = ?', [vehicle.registration]);
    if (!existing) {
      await run(db, 'INSERT INTO vehicles (label, registration, fuel_type) VALUES (?, ?, ?)', [vehicle.label, vehicle.registration, vehicle.fuel_type]);
    }
  }
  const drivers = [
    { first_name: 'Ahmed', last_name: 'Ould Sidi', phone: '22220001' },
    { first_name: 'Mohamed', last_name: 'Ould Ahmed', phone: '22220002' },
    { first_name: 'Sidi', last_name: 'Ould Cheikh', phone: '22220003' },
    { first_name: 'Oumar', last_name: 'Ould Mohamed', phone: '22220004' },
    { first_name: 'Ibrahim', last_name: 'Ould Abderrahmane', phone: '22220005' },
    { first_name: 'Amadou', last_name: 'Ould Salim', phone: '22220006' },
    { first_name: 'Boubacar', last_name: 'Ould Moussa', phone: '22220007' },
    { first_name: 'Abdoulaye', last_name: 'Ould Ali', phone: '22220008' },
    { first_name: 'Moussa', last_name: 'Ould Sidi Mohamed', phone: '22220009' },
    { first_name: 'Hamady', last_name: 'Ould Baba', phone: '22220010' },
    { first_name: 'Samba', last_name: 'Ould Diallo', phone: '22220011' },
    { first_name: 'Cheikh', last_name: 'Ould Fall', phone: '22220012' },
    { first_name: 'Salif', last_name: 'Ould Niang', phone: '22220013' },
    { first_name: 'Mamadou', last_name: 'Ould Sy', phone: '22220014' },
    { first_name: 'Ibrahima', last_name: 'Ould Kane', phone: '22220015' }
  ];
  for (const driver of drivers) {
    const existing = await get(db, 'SELECT id FROM drivers WHERE first_name = ? AND last_name = ?', [driver.first_name, driver.last_name]);
    if (!existing) {
      await run(db, 'INSERT INTO drivers (first_name, last_name, phone) VALUES (?, ?, ?)', [driver.first_name, driver.last_name, driver.phone]);
    }
  }
}


const ROLE_CODES = ['super_admin', 'dg', 'daf', 'moyens_generaux', 'technique', 'rh', 'ingenieur'];

const PERMISSIONS = [
  'mission_create',
  'mission_validate_technical',
  'mission_assign_logistics',
  'mission_validate_finance',
  'mission_validate_final',
  'mission_close',
  'user_admin_rh'
];

const ROLE_PERMISSION_MATRIX = {
  super_admin: PERMISSIONS,
  dg: ['mission_validate_final', 'mission_close'],
  daf: ['mission_validate_finance'],
  moyens_generaux: ['mission_assign_logistics'],
  technique: ['mission_validate_technical'],
  rh: ['user_admin_rh'],
  ingenieur: ['mission_create']
};

const DEFAULT_USERS = [
  {
    role: 'super_admin',
    email: 'admin@anesp.mr',
    firstName: 'Super',
    lastName: 'Administrateur'
  },
  {
    role: 'dg',
    email: 'dg@anesp.gov',
    firstName: 'Directeur',
    lastName: 'General'
  },
  {
    role: 'daf',
    email: 'daf@anesp.gov',
    firstName: 'Directeur',
    lastName: 'Financier'
  },
  {
    role: 'moyens_generaux',
    email: 'mg@anesp.gov',
    firstName: 'Chef',
    lastName: 'MoyensGeneraux'
  },
  {
    role: 'technique',
    email: 'tech@anesp.gov',
    firstName: 'Directeur',
    lastName: 'Technique'
  },
  {
    role: 'rh',
    email: 'rh@anesp.gov',
    firstName: 'Responsable',
    lastName: 'RH'
  },
  {
    role: 'ingenieur',
    email: 'engineer@anesp.gov',
    firstName: 'Ingenieur',
    lastName: 'Terrain'
  }
];

async function ensureRoles(db) {
  for (const code of ROLE_CODES) {
    const existing = await get(db, 'SELECT id FROM roles WHERE code = ?', [code]);
    if (!existing) {
      await run(db, 'INSERT INTO roles (code, name) VALUES (?, ?)', [code, code.replace(/_/g, ' ').toUpperCase()]);
    }
  }
}

async function ensurePermissions(db) {
  for (const code of PERMISSIONS) {
    const existing = await get(db, 'SELECT id FROM permissions WHERE code = ?', [code]);
    if (!existing) {
      await run(db, 'INSERT INTO permissions (code, description) VALUES (?, ?)', [code, code]);
    }
  }
}

async function ensureRolePermissions(db) {
  for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const role = await get(db, 'SELECT id FROM roles WHERE code = ?', [roleCode]);
    for (const permCode of permissions) {
      const perm = await get(db, 'SELECT id FROM permissions WHERE code = ?', [permCode]);
      const existing = await get(
        db,
        'SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?',
        [role.id, perm.id]
      );
      if (!existing) {
        await run(db, 'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, perm.id]);
      }
    }
  }
}

async function ensureDefaultUsers(db) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);
  for (const user of DEFAULT_USERS) {
    const existing = await get(db, 'SELECT id FROM users WHERE email = ?', [user.email]);
    if (!existing) {
      const role = await get(db, 'SELECT id FROM roles WHERE code = ?', [user.role]);
      await run(
        db,
        `INSERT INTO users (first_name, last_name, email, password_hash, grade, direction, role_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)` ,
        [user.firstName, user.lastName, user.email, passwordHash, 'A', 'Direction', role.id]
      );
    }
  }
}

async function seed(db) {
  await ensureRoles(db);
  await ensurePermissions(db);
  await ensureRolePermissions(db);
  await ensureDefaultUsers(db);
  await ensureLogisticsResources(db);
}

module.exports = { seed };
