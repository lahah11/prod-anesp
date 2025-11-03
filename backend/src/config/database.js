const { Pool } = require('pg');
const env = require('./env');

let pool;

function resolvePoolConfig() {
  if (env.DB_EMULATOR === 'pg-mem') {
    const { newDb } = require('pg-mem');
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = db.adapters.createPg();
    return { Pool: adapter.Pool, config: {} };
  }

  const config = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.DB_HOST || 'localhost',
        port: Number(env.DB_PORT) || 5432,
        user: env.DB_USER || 'postgres',
        password: env.DB_PASSWORD || 'postgres',
        database: env.DB_NAME || 'anesp'
      };

  if (env.DB_SSL && env.DB_SSL !== 'false') {
    config.ssl = { rejectUnauthorized: false };
  }

  return { Pool, config };
}

function ensurePool() {
  if (pool) {
    return pool;
  }
  const { Pool: PoolClass, config } = resolvePoolConfig();
  pool = new PoolClass(config);
  return pool;
}

async function connect() {
  const activePool = ensurePool();
  const client = await activePool.connect();
  return client;
}

function convertPlaceholders(sql, params) {
  if (!params || !params.length) {
    return { text: sql, values: [] };
  }
  let index = 0;
  const text = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return { text, values: params };
}

async function run(client, sql, params = []) {
  const { text, values } = convertPlaceholders(sql, params);
  const result = await client.query(text, values);
  const firstRow = result.rows && result.rows[0];
  return {
    lastID: firstRow && (firstRow.id || firstRow.inserted_id || null),
    changes: result.rowCount,
    rows: result.rows
  };
}

async function get(client, sql, params = []) {
  const { text, values } = convertPlaceholders(sql, params);
  const result = await client.query(text, values);
  return result.rows[0];
}

async function all(client, sql, params = []) {
  const { text, values } = convertPlaceholders(sql, params);
  const result = await client.query(text, values);
  return result.rows;
}

async function release(client) {
  if (client) {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  connect,
  run,
  get,
  all,
  release,
  closePool,
  convertPlaceholders
};
