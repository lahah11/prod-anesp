const { connect } = require('../config/database');
const { createTables } = require('../db/schema');
const { seed } = require('../db/seed');

(async () => {
  const db = await connect();
  try {
    await createTables(db);
    await seed(db);
  } finally {
    db.release();
  }
  console.log('Seed completed');
})();
