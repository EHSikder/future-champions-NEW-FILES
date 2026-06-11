const express  = require('express');
const router   = express.Router();
const supabase = require('../config/database');
const adminAuth = require('../middleware/adminAuth');
const auth      = require('../middleware/auth');

const MCQ_BONUS_POINTS = 5;

/* ─── ADMIN: List all questions ─────────────────────────── */
router.get('/admin/mcq', adminAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('mcq_questions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

/* ─── ADMIN: Create question ─────────────────────────────── */
router.post('/admin/mcq', adminAuth, async (req, res, next) => {
  try {
    const { question, options, correct_answer, round_trigger, is_active } = req.body;

    if (!question || !options?.length || !correct_answer || !round_trigger) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!options.includes(correct_answer)) {
      return res.status(400).json({ error: 'correct_answer must be one of the options.' });
    }

    const { data, error } = await supabase
      .from('mcq_questions')
      .insert([{ question, options, correct_answer, round_trigger, is_active: !!is_active }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ─── ADMIN: Update question ─────────────────────────────── */
router.put('/admin/mcq/:id', adminAuth, async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['question', 'options', 'correct_answer', 'round_trigger', 'is_active'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const { data, error } = await supabase
      .from('mcq_questions')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ─── ADMIN: Delete question ─────────────────────────────── */
router.delete('/admin/mcq/:id', adminAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('mcq_questions')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ─── PLAYER: Get active MCQ ─────────────────────────────── */
router.get('/mcq/active', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all active questions
    const { data: questions, error } = await supabase
      .from('mcq_questions')
      .select('id, question, options, round_trigger')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!questions?.length) return res.json({ active: false });

    // Find one the user hasn't answered yet
    const { data: answered } = await supabase
      .from('mcq_answers')
      .select('question_id')
      .eq('user_id', userId);

    const answeredIds = new Set((answered || []).map(a => a.question_id));
    const unanswered  = questions.filter(q => !answeredIds.has(q.id));

    if (!unanswered.length) return res.json({ active: false });

    const next = unanswered[0];
    res.json({
      active:       true,
      id:           next.id,
      question:     next.question,
      options:      next.options,
      round_trigger: next.round_trigger,
    });
  } catch (err) { next(err); }
});

/* ─── PLAYER: Submit MCQ answer ──────────────────────────── */
router.post('/mcq/answer', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { question_id, answer } = req.body;

    if (!question_id || !answer) {
      return res.status(400).json({ error: 'question_id and answer required.' });
    }

    // Check already answered
    const { data: existing } = await supabase
      .from('mcq_answers')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', question_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Already answered this question.' });
    }

    // Get correct answer
    const { data: question, error: qErr } = await supabase
      .from('mcq_questions')
      .select('correct_answer')
      .eq('id', question_id)
      .single();

    if (qErr || !question) return res.status(404).json({ error: 'Question not found.' });

    const isCorrect    = answer.trim() === question.correct_answer.trim();
    const pointsEarned = isCorrect ? MCQ_BONUS_POINTS : 0;

    // Record answer
    const { error: insertErr } = await supabase
      .from('mcq_answers')
      .insert([{
        user_id:      userId,
        question_id,
        answer,
        is_correct:   isCorrect,
        points_earned: pointsEarned,
      }]);

    if (insertErr) throw insertErr;

    // Award bonus points
    if (isCorrect) {
      await supabase.rpc('add_mcq_bonus_points', { p_user_id: userId, p_points: pointsEarned });
    }

    res.json({ success: true, correct: isCorrect, points_earned: pointsEarned });
  } catch (err) { next(err); }
});

module.exports = router;
