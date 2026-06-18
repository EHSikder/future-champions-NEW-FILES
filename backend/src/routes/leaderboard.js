const express = require('express');
const router  = express.Router();
const supabase = require('../config/database');

// Each leaderboard tab maps to ONE authoritative, pre-computed column on the
// users table (kept in sync by the DB function recalculate_user_points). Both
// "overall" and the round tabs now read from the same source, so a round total
// can never disagree with the overall total. Round 3 already includes the Final
// (the system is 3 rounds — round 4 was merged into round 3).
const ROUND_COLUMN = {
  group_stage:              'points_round_1',
  round_of_32_16:           'points_round_2',
  quarterfinal_semifinal:   'points_round_3',
};

/**
 * GET /api/leaderboard
 * Query params:
 *   limit   - max results (default 50, max 200)
 *   round   - round key: group_stage | round_of_32_16 | quarterfinal_semifinal
 *             omit for the overall leaderboard (uses total_points)
 */
router.get('/', async (req, res, next) => {
  try {
    const limit      = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const roundGroup = req.query.round; // optional round key

    // Pick the points column: a specific round bucket, or the overall total.
    // pointsCol comes from a fixed whitelist, so it is safe to interpolate.
    const pointsCol = ROUND_COLUMN[roundGroup] || 'total_points';

    const { data: users, error } = await supabase
      .from('users')
      .select(`id, full_name, display_name, ${pointsCol}`)
      .order(pointsCol, { ascending: false })
      .order('created_at', { ascending: true })  // tie-break by signup date
      .limit(limit);

    if (error) throw error;

    const ranked = (users || []).map((u, i) => ({
      id:           u.id,
      full_name:    u.full_name    || u.display_name || 'Player',
      display_name: u.display_name || u.full_name    || 'Player',
      total_points: u[pointsCol] ?? 0,   // the UI reads `total_points` for every tab
      rank:         i + 1,
    }));

    res.json(ranked);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Returns a specific user's rank and point breakdown by round
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, full_name, total_points, has_submitted_prediction')
      .eq('id', userId)
      .single();

    if (error || !userRow) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { data: predictions } = await supabase
      .from('predictions')
      .select('match_number, points_earned, matches!inner(round)')
      .eq('user_id', userId)
      .gt('points_earned', 0);

    const pointsByRound = {};
    for (const pred of (predictions || [])) {
      const round = pred.matches?.round;
      if (!pointsByRound[round]) pointsByRound[round] = { points: 0, correct: 0 };
      pointsByRound[round].points  += pred.points_earned;
      pointsByRound[round].correct += 1;
    }

    const { data: mcqAnswers } = await supabase
      .from('mcq_answers')
      .select('points_earned, mcq_questions!inner(round_trigger)')
      .eq('user_id', userId)
      .eq('is_correct', true);

    const mcqByRound = {};
    for (const a of (mcqAnswers || [])) {
      const r = a.mcq_questions?.round_trigger;
      mcqByRound[r] = (mcqByRound[r] || 0) + (a.points_earned || 0);
    }

    res.json({
      success: true,
      data: {
        ...userRow,
        points_by_round: pointsByRound,
        mcq_points_by_round: mcqByRound,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
