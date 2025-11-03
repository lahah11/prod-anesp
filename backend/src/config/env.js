const path = require('path');
const dotenv = require('dotenv');

const envPath = process.env.ANESP_ENV_PATH || path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_SSL: process.env.DB_SSL,
  DB_EMULATOR: process.env.DB_EMULATOR,
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@anesp.gov',
  SMTP_SERVICE: process.env.SMTP_SERVICE,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  STORAGE_ROOT: process.env.STORAGE_ROOT || path.join(__dirname, '../../storage'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};

module.exports = env;
