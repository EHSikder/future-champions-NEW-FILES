const express  = require('express');
const router   = express.Router();
const admin    = require('firebase-admin');
const supabase = require('../config/database');
const { signToken } = require('../utils/jwt');
const auth     = require('../middleware/auth');

// ── Firebase Admin initialisation (idempotent) ───────────────
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (err) {
    console.warn('[Auth] Firebase Admin init failed:', err.message);
  }
}

/**
 * POST /api/auth/verify
 * Exchange a Firebase ID token for a Future Champions JWT.
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required.' });
    }

    // Verify the Firebase token
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid Firebase token.' });
    }

    const { uid, email, phone_number } = decoded;

    // Look up or create user record
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          firebase_uid:  uid,
          email:         email || null,
          mobile_number: phone_number || null,
          is_verified:   false,
        })
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    const token = signToken({ userId: user.id, firebaseUid: uid });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id:                      user.id,
          full_name:               user.full_name,
          email:                   user.email,
          mobile_number:           user.mobile_number,
          is_verified:             user.is_verified,
          has_submitted_prediction: user.has_submitted_prediction,
          total_points:            user.total_points,
          favorite_team_id:        user.favorite_team_id,
          display_name:            user.display_name,
          profile_complete:        !!(user.full_name && user.favorite_team_id),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile + prediction stats.
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, display_name, email, mobile_number, civil_id, company_name, hear_about_us, is_verified, has_submitted_prediction, total_points, favorite_team_id, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // ── Build prediction stats ──────────────────────────────
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('match_number, points_earned')
      .eq('user_id', req.user.userId);

    if (predError) throw predError;

    const totalPredictions = predictions?.length || 0;
    const correctPredictions = (predictions || []).filter(p => (p.points_earned || 0) > 0).length;

    // Fetch the round for each predicted match, then group points by round
    let pointsBreakdown = {};
    if (totalPredictions > 0) {
      const matchNumbers = predictions.map(p => p.match_number);

      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('match_number, round')
        .in('match_number', matchNumbers);

      if (matchError) throw matchError;

      const roundByMatch = {};
      (matches || []).forEach(m => { roundByMatch[m.match_number] = m.round; });

      pointsBreakdown = predictions.reduce((acc, p) => {
        const round = roundByMatch[p.match_number] || 'unknown';
        acc[round] = (acc[round] || 0) + (p.points_earned || 0);
        return acc;
      }, {});
    }

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          total_predictions: totalPredictions,
          correct_predictions: correctPredictions,
          points_breakdown: pointsBreakdown,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/profile
 * Complete or update user profile.
 */
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { full_name, civil_id, email, favorite_team_id, display_name, company_name, mobile_number, hear_about_us } = req.body;
    const updates = {};

    if (full_name        !== undefined) updates.full_name        = full_name;
    if (civil_id         !== undefined) updates.civil_id         = civil_id;
    if (email            !== undefined) updates.email            = email;
    if (favorite_team_id !== undefined) updates.favorite_team_id = favorite_team_id;
    if (display_name     !== undefined) updates.display_name     = display_name;
    if (company_name     !== undefined) updates.company_name     = company_name;
    if (mobile_number    !== undefined) updates.mobile_number    = mobile_number;
    if (hear_about_us    !== undefined) updates.hear_about_us    = hear_about_us;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.userId)
      .select()
      .single();

    if (error) throw error;

    // Return a fresh token so the frontend can update its session
    const newToken = signToken({ userId: req.user.userId, firebaseUid: req.user.firebaseUid });

    res.json({
      success: true,
      message: 'Profile updated.',
      data: {
        token: newToken,
        user: {
          id:                      user.id,
          full_name:               user.full_name,
          email:                   user.email,
          mobile_number:           user.mobile_number,
          is_verified:             user.is_verified,
          has_submitted_prediction: user.has_submitted_prediction,
          total_points:            user.total_points,
          favorite_team_id:        user.favorite_team_id,
          display_name:            user.display_name,
          profile_complete:        !!(user.full_name && user.favorite_team_id),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
