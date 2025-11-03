const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const missionRoutes = require('./routes/missionRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const { connect } = require('./config/database');
const { createTables } = require('./db/schema');
const { seed } = require('./db/seed');
const env = require('./config/env');
const { ensureDir } = require('./utils/storage');

async function initialize() {
  const db = await connect();
  try {
    await createTables(db);
    await seed(db);
  } finally {
    db.release();
  }
  ensureDir(env.STORAGE_ROOT);
}

function createApp() {
  const app = express();
  app.use(helmet());
  
  // Configure CORS to allow both ports 3000 and 3001 in development
  const allowedOrigins = env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:3001']
    : [env.FRONTEND_URL];
  
  app.use(cors({ 
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true 
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200
    })
  );

  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-secret') {
    throw new Error('JWT secret must be provided in production');
  }

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  
  app.use('/api/auth', authRoutes);
  app.use(authMiddleware);
  app.use('/api/missions', missionRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/mission-documents', documentRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use((err, req, res, next) => {
    console.error('Unhandled error', err);
    const status = err.status || 500;
    const responseMessage = status === 500 && env.NODE_ENV === 'production'
      ? 'Erreur interne'
      : err.message || 'Erreur interne';
    res.status(status).json({ message: responseMessage });
  });
  return app;
}

module.exports = { createApp, initialize };
