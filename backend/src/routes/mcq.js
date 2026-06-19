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
    // Return { success, data } so it matches every other admin endpoint
    // (the frontend reads res.data — a bare array left it showing 0 questions).
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

/* ─── ADMIN: Create question ─────────────────────────────── */
router.post('/admin/mcq', adminAuth, async (req, res, next) => {
  try {
    const { question, options, correct_answer, round_trigger, is_active } = req.body;

    // Trim + drop blank options so an accidental empty box can't break things.
    const cleanOptions = Array.isArray(options)
      ? options.map(o => (typeof o === 'string' ? o.trim() : o)).filter(Boolean)
      : [];
    const cleanQuestion = (question || '').trim();
    const cleanCorrect  = (correct_answer || '').trim();

    if (!cleanQuestion || cleanOptions.length < 2 || !cleanCorrect) {
      return res.status(400).json({ success: false, message: 'Question, at least 2 options, and a correct answer are required.' });
    }
    if (!cleanOptions.includes(cleanCorrect)) {
      return res.status(400).json({ success: false, message: 'The correct answer must exactly match one of the options.' });
    }

    const { data, error } = await supabase
      .from('mcq_questions')
      // A question is shown purely by being Active — no stage trigger needed.
      // round_trigger still satisfies the NOT NULL column and attributes the
      // bonus to round 1 for scoring; the admin never has to choose it.
      .insert([{ question: cleanQuestion, options: cleanOptions, correct_answer: cleanCorrect, round_trigger: round_trigger || 'group_stage', is_active: !!is_active }])
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

    // If options/correct_answer are being edited, keep them consistent.
    if (updates.options) {
      updates.options = updates.options
        .map(o => (typeof o === 'string' ? o.trim() : o))
        .filter(Boolean);
    }
    if (updates.correct_answer) updates.correct_answer = updates.correct_answer.trim();
    if (updates.options && updates.correct_answer && !updates.options.includes(updates.correct_answer)) {
      return res.status(400).json({ success: false, message: 'The correct answer must match one of the options.' });
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
    // Remove any answers first so the FK constraint doesn't block the delete.
    await supabase.from('mcq_answers').delete().eq('question_id', req.params.id);

    const { error } = await supabase
      .from('mcq_questions')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ─── PLAYER: Get ALL active questions + this user's answer state ───────────
   Powers the QUIZ page: every active question is shown. Unanswered ones are
   interactive; answered ones come back locked with the result so the UI can
   grey them out and reveal the correct option. */
router.get('/mcq/all', auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: questions, error } = await supabase
      .from('mcq_questions')
      .select('id, question, options, round_trigger, correct_answer')
      .eq('is_active', true)
      .order('created_at', { ascending: true }); // stable oldest-first order

    if (error) throw error;

    const { data: answers } = await supabase
      .from('mcq_answers')
      .select('question_id, answer, is_correct, points_earned')
      .eq('user_id', userId);

    const answerByQuestion = {};
    (answers || []).forEach(a => { answerByQuestion[a.question_id] = a; });

    const list = (questions || []).map(q => {
      const a = answerByQuestion[q.id];
      return {
        id:            q.id,
        question:      q.question,
        options:       q.options,
        round_trigger: q.round_trigger,
        answered:      !!a,
        // Only reveal correctness + the right answer AFTER the user has answered,
        // so the correct answer is never leaked for unanswered questions.
        your_answer:    a ? a.answer        : null,
        is_correct:     a ? a.is_correct     : null,
        points_earned:  a ? a.points_earned  : null,
        correct_answer: a ? q.correct_answer : null,
      };
    });

    res.json({
      success:        true,
      questions:      list,
      total_answered: list.filter(q => q.answered).length,
      total_points:   list.reduce((sum, q) => sum + (q.points_earned || 0), 0),
    });
  } catch (err) { next(err); }
});

/* ─── PLAYER: Get the next single active question (legacy/banner) ───────────
   Used by the inline QUIZ banner on the matches page. */
router.get('/mcq/active', auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: questions, error } = await supabase
      .from('mcq_questions')
      .select('id, question, options, round_trigger')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!questions?.length) return res.json({ success: true, data: { active: false } });

    const { data: answered } = await supabase
      .from('mcq_answers')
      .select('question_id')
      .eq('user_id', userId);

    const answeredIds = new Set((answered || []).map(a => a.question_id));
    const unanswered  = questions.filter(q => !answeredIds.has(q.id));

    if (!unanswered.length) return res.json({ success: true, data: { active: false } });

    const next = unanswered[0];
    res.json({
      success: true,
      data: {
        active:        true,
        id:            next.id,
        question:      next.question,
        options:       next.options,
        round_trigger: next.round_trigger,
      },
    });
  } catch (err) { next(err); }
});

/* ─── PLAYER: Submit MCQ answer ──────────────────────────── */
router.post('/mcq/answer', auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { question_id, answer } = req.body;

    if (!question_id || !answer) {
      return res.status(400).json({ success: false, message: 'question_id and answer are required.' });
    }

    // Get the question (also confirms it exists + is the source of truth).
    const { data: question, error: qErr } = await supabase
      .from('mcq_questions')
      .select('correct_answer')
      .eq('id', question_id)
      .single();

    if (qErr || !question) return res.status(404).json({ success: false, message: 'Question not found.' });

    // Block double-answering.
    const { data: existing } = await supabase
      .from('mcq_answers')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', question_id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already answered this question.' });
    }

    const isCorrect    = answer.trim() === question.correct_answer.trim();
    const pointsEarned = isCorrect ? MCQ_BONUS_POINTS : 0;

    const { error: insertErr } = await supabase
      .from('mcq_answers')
      .insert([{
        user_id:       userId,
        question_id,
        answer,
        is_correct:    isCorrect,
        points_earned: pointsEarned,
      }]);

    if (insertErr) throw insertErr;

    // Recompute the user's points (the DB function folds the bonus into the
    // correct round). Always call it so totals stay authoritative.
    const { error: rpcErr } = await supabase.rpc('add_mcq_bonus_points', {
      p_user_id: userId,
      p_points:  pointsEarned,
    });
    if (rpcErr) console.error('add_mcq_bonus_points failed:', rpcErr.message);

    res.json({
      success:        true,
      correct:        isCorrect,
      points_earned:  pointsEarned,
      correct_answer: question.correct_answer, // let the UI reveal the right option
    });
  } catch (err) { next(err); }
});

module.exports = router;
