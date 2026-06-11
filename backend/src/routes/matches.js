const express  = require('express');
const router   = express.Router();
const supabase = require('../config/database');

/**
 * GET /api/matches
 * Returns all matches, optionally filtered by round or status.
 */
router.get('/', async (req, res, next) => {
  try {
    const { round, status, limit = 100 } = req.query;

    let query = supabase
      .from('matches')
      .select(`
        match_number,
        round,
        kickoff_time,
        status,
        home_placeholder,
        away_placeholder,
        home_score,
        away_score,
        home_extra_time_score,
        away_extra_time_score,
        home_penalty_score,
        away_penalty_score,
        home_team_id,
        away_team_id,
        winner_team_id,
        home_team:home_team_id (id, name, short_code, flag_url),
        away_team:away_team_id (id, name, short_code, flag_url),
        winner_team:winner_team_id (id, name, short_code, flag_url)
      `)
      .order('kickoff_time', { ascending: true })
      .limit(parseInt(limit, 10));

    if (round)  query = query.eq('round', round);
    if (status) query = query.eq('status', status);

    const { data: matches, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: matches || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/matches/:matchNumber
 * Returns a single match by its match_number.
 */
router.get('/:matchNumber', async (req, res, next) => {
  try {
    const { matchNumber } = req.params;

    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:home_team_id (id, name, short_code, flag_url),
        away_team:away_team_id (id, name, short_code, flag_url),
        winner_team:winner_team_id (id, name, short_code, flag_url)
      `)
      .eq('match_number', matchNumber)
      .single();

    if (error || !match) {
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
