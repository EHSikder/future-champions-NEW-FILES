const express = require('express');
const router  = express.Router();
const supabase = require('../config/database');

// Round groupings for leaderboard tabs
const ROUND_GROUPS = {
  group_stage:              ['group_stage'],
  round_of_32_16:           ['round_of_32', 'round_of_16'],
  quarterfinal_semifinal:   ['quarterfinal', 'semifinal'],
  final:                    ['final'],
};

/**
 * GET /api/leaderboard
 * Query params:
 *   limit   - max results (default 50, max 200)
 *   round   - round group key: group_stage | round_of_32_16 | quarterfinal_semifinal | final
 *             omit for overall leaderboard
 */
router.get('/', async (req, res, next) => {
  try {
    const limit      = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const roundGroup = req.query.round; // optional round group key

    // Overall leaderboard — use stored total_points
    if (!roundGroup || !ROUND_GROUPS[roundGroup]) {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, display_name, total_points')
        .not('full_name', 'is', null)
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const ranked = (users || []).map((u, i) => ({
        ...u,
        rank: i + 1,
      }));

      return res.json(ranked);
    }

    // Round-specific leaderboard — aggregate points from predictions in those rounds
    const rounds = ROUND_GROUPS[roundGroup];

    const { data: preds, error: predErr } = await supabase
      .from('predictions')
      .select(`
        user_id,
        points_earned,
        matches!inner(round)
      `)
      .in('matches.round', rounds)
      .eq('is_locked', true);

    if (predErr) throw predErr;

    // Also include MCQ bonus points for this round group
    const { data: mcqAnswers } = await supabase
      .from('mcq_answers')
      .select('user_id, points_earned, mcq_questions!inner(round_trigger)')
      .in('mcq_questions.round_trigger', rounds)
      .eq('is_correct', true);

    // Aggregate by user
    const userPoints = {};
    for (const p of (preds || [])) {
      if (!userPoints[p.user_id]) userPoints[p.user_id] = 0;
      userPoints[p.user_id] += p.points_earned || 0;
    }
    for (const a of (mcqAnswers || [])) {
      if (!userPoints[a.user_id]) userPoints[a.user_id] = 0;
      userPoints[a.user_id] += a.points_earned || 0;
    }

    // Fetch user names
    const userIds = Object.keys(userPoints);
    if (userIds.length === 0) return res.json([]);

    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, full_name, display_name')
      .in('id', userIds);

    if (userErr) throw userErr;

    const ranked = (users || [])
      .map(u => ({ ...u, total_points: userPoints[u.id] || 0 }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit)
      .map((u, i) => ({ ...u, rank: i + 1 }));

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
