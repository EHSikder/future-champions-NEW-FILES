/**
 * Simple inline validators for admin routes.
 * These are arrays of middleware (empty = no extra validation needed),
 * plus a `validate` runner that checks for any accumulated errors.
 *
 * To add real express-validator rules later just replace the arrays.
 */

/** Middleware array run before POST /api/admin/lock-round */
const lockRoundRules = [];

/** Middleware array run before PUT /api/admin/teams/:id */
const updateTeamRules = [];

/** Middleware array run before GET /api/admin/export */
const exportRules = [];

/**
 * Runs after a rules array.
 * With express-validator rules in the arrays above, this would call
 * validationResult(req) and return 422 on failure.
 * Without any rules it is a no-op pass-through.
 */
function validate(req, res, next) {
  // Manual fallback validations
  if (req.path === '/lock-round') {
    const { round, is_locked } = req.body;
    if (!round || typeof is_locked !== 'boolean') {
      return res.status(422).json({
        success: false,
        message: '`round` (string) and `is_locked` (boolean) are required.',
      });
    }
  }

  if (req.path.startsWith('/export')) {
    const { type, format } = req.query;
    const validTypes   = ['users', 'predictions', 'leaderboard'];
    const validFormats = ['xlsx', 'csv'];
    if (!validTypes.includes(type) || !validFormats.includes(format)) {
      return res.status(422).json({
        success: false,
        message: `\`type\` must be one of [${validTypes}] and \`format\` one of [${validFormats}].`,
      });
    }
  }

  next();
}

module.exports = { lockRoundRules, updateTeamRules, exportRules, validate };
