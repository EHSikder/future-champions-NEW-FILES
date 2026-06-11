const express  = require('express');
const router   = express.Router();
const supabase = require('../config/database');
const auth     = require('../middleware/auth');

/**
 * POST /api/notifications/subscribe
 * Save a push subscription for the authenticated user.
 */
router.post('/subscribe', auth, async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription object.' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id:      req.user.userId,
          endpoint:     subscription.endpoint,
          subscription: subscription,
        },
        { onConflict: 'endpoint' }
      );

    if (error) throw error;

    res.json({ success: true, message: 'Push subscription saved.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications/unsubscribe
 * Remove a push subscription.
 */
router.delete('/unsubscribe', auth, async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint is required.' });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', req.user.userId);

    if (error) throw error;

    res.json({ success: true, message: 'Unsubscribed.' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/vapid-key
 * Returns the public VAPID key for the client to use when subscribing.
 */
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ success: false, message: 'Push notifications not configured.' });
  }
  res.json({ success: true, data: { vapidPublicKey: key } });
});

module.exports = router;
