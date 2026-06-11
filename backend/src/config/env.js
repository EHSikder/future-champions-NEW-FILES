const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Only truly required vars — ADMIN_JWT_SECRET is auto-derived in jwt.js
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const env = Object.freeze({
  PORT: parseInt(process.env.PORT, 10) || 3001,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || '',
  // World Cup API — env var is WORLDCUP_API_KEY per render.yaml / .env.example
  API_FOOTBALL_KEY: process.env.WORLDCUP_API_KEY || process.env.API_FOOTBALL_KEY || '',
  WORLDCUP_API_BASE_URL: process.env.WORLDCUP_API_BASE_URL || 'https://api.worldcupapi.com',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  MOCK_OTP: (process.env.MOCK_OTP || 'true').toLowerCase() === 'true',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
});

module.exports = env;

