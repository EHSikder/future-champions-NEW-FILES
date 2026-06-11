const express  = require('express');
const router   = express.Router();
const supabase = require('../config/database');

/**
 * GET /api/teams
 * Returns all teams, optionally filtered by group.
 */
router.get('/', async (req, res, next) => {
  try {
    const { group } = req.query;

    let query = supabase
      .from('teams')
      .select('id, name, short_code, flag_url, logo_url, group_letter')
      .order('name', { ascending: true });

    if (group) query = query.eq('group_letter', group.toUpperCase());

    const { data: teams, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: teams || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/teams/:id
 * Returns a single team by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
