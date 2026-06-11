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
          profile_complete:        !!user.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, mobile_number, civil_id, is_verified, has_submitted_prediction, total_points, favorite_team_id, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: user });
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
    const { full_name, civil_id, email, favorite_team_id } = req.body;
    const updates = {};

    if (full_name   !== undefined) updates.full_name        = full_name;
    if (civil_id    !== undefined) updates.civil_id         = civil_id;
    if (email       !== undefined) updates.email            = email;
    if (favorite_team_id !== undefined) updates.favorite_team_id = favorite_team_id;

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

    res.json({ success: true, message: 'Profile updated.', data: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
