// Load environment variables FIRST — before any other module reads process.env
require('./config/env');

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const { rateLimit } = require('./middleware/rateLimit');
const errorHandler  = require('./middleware/errorHandler');

// Routes
const authRoutes          = require('./routes/auth');
const matchRoutes         = require('./routes/matches');
const predictionRoutes    = require('./routes/predictions');
const leaderboardRoutes   = require('./routes/leaderboard');
const teamsRoutes         = require('./routes/teams');
const adminRoutes         = require('./routes/admin');
const notificationRoutes  = require('./routes/notifications');
const mcqRoutes           = require('./routes/mcq');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Trust proxy (required for Render / any reverse-proxy) ────
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());

// Build the allowed origins list
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, ''))
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(rateLimit);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/matches',       matchRoutes);
app.use('/api/predictions',   predictionRoutes);
app.use('/api/leaderboard',   leaderboardRoutes);
app.use('/api/teams',         teamsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api',               mcqRoutes);   // registers /api/mcq/* and /api/admin/mcq/*

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Future Champions API', timestamp: new Date() });
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Cron jobs (non-blocking) ──────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  try { require('./cron/syncMatches');     } catch (e) { console.warn('syncMatches cron skipped:', e.message); }
  try { require('./cron/notificationCron'); } catch (e) { console.warn('notificationCron skipped:', e.message); }
}

app.listen(PORT, () => {
  console.log(`🚀 Future Champions API running on port ${PORT}`);
});

module.exports = app;
