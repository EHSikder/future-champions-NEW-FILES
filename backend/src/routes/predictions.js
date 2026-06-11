const express  = require('express');
const router   = express.Router();
const supabase = require('../config/database');
const auth     = require('../middleware/auth');

/**
 * GET /api/predictions
 * Returns the authenticated user's predictions.
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        id,
        match_number,
        predicted_winner_team_id,
        predicted_home_score,
        predicted_away_score,
        is_locked,
        locked_reason,
        points_earned,
        created_at,
        predicted_winner:predicted_winner_team_id (id, name, short_code, flag_url)
      `)
      .eq('user_id', req.user.userId)
      .order('match_number', { ascending: true });

    if (error) throw error;

    // Also fetch champion prediction
    const { data: champPred } = await supabase
      .from('champion_predictions')
      .select(`
        predicted_champion_team_id,
        points_earned,
        predicted_champion:predicted_champion_team_id (id, name, short_code, flag_url)
      `)
      .eq('user_id', req.user.userId)
      .single();

    res.json({
      success: true,
      data: {
        predictions: predictions || [],
        champion_prediction: champPred || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/predictions
 * Submit or update a batch of predictions.
 * Body: { predictions: [{match_number, predicted_winner_team_id, predicted_home_score, predicted_away_score}],
 *         champion_team_id? }
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { predictions = [], champion_team_id } = req.body;
    const userId = req.user.userId;

    if (!predictions.length && !champion_team_id) {
      return res.status(400).json({ success: false, message: 'No predictions provided.' });
    }

    // Check bracket locks for each match
    const matchNumbers = predictions.map((p) => p.match_number);
    if (matchNumbers.length) {
      const { data: lockedMatches } = await supabase
        .from('predictions')
        .select('match_number')
        .eq('user_id', userId)
        .eq('is_locked', true)
        .in('match_number', matchNumbers);

      const lockedSet = new Set((lockedMatches || []).map((m) => m.match_number));
      const blockedPreds = predictions.filter((p) => lockedSet.has(p.match_number));
      if (blockedPreds.length) {
        return res.status(403).json({
          success: false,
          message: `Predictions for match(es) ${blockedPreds.map((p) => p.match_number).join(', ')} are locked.`,
        });
      }
    }

    // Upsert predictions
    const rows = predictions.map((p) => ({
      user_id:                   userId,
      match_number:              p.match_number,
      predicted_winner_team_id:  p.predicted_winner_team_id,
      predicted_home_score:      p.predicted_home_score ?? null,
      predicted_away_score:      p.predicted_away_score ?? null,
    }));

    if (rows.length) {
      const { error } = await supabase
        .from('predictions')
        .upsert(rows, { onConflict: 'user_id,match_number' });
      if (error) throw error;
    }

    // Upsert champion prediction
    if (champion_team_id) {
      const { error } = await supabase
        .from('champion_predictions')
        .upsert({ user_id: userId, predicted_champion_team_id: champion_team_id }, { onConflict: 'user_id' });
      if (error) throw error;
    }

    // Mark user as having submitted
    await supabase
      .from('users')
      .update({ has_submitted_prediction: true })
      .eq('id', userId);

    res.json({ success: true, message: 'Predictions saved.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
