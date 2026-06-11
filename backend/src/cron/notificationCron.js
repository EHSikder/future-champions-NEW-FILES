const cron = require('node-cron');
const supabase = require('../config/database');
const webpush  = require('web-push');

// Configure web-push once, at startup
if (
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_EMAIL
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[NotificationCron] VAPID keys not set — push notifications disabled.');
}

/**
 * Send push notifications for matches kicking off within the next 30 minutes.
 */
async function sendUpcomingMatchNotifications() {
  try {
    const now    = new Date();
    const in30   = new Date(now.getTime() + 30 * 60 * 1000);

    // Find matches starting in ~30 min that haven't been notified yet
    const { data: upcomingMatches, error: matchError } = await supabase
      .from('matches')
      .select('match_number, round, home_placeholder, away_placeholder, kickoff_time')
      .eq('status', 'scheduled')
      .eq('notification_sent', false)
      .gte('kickoff_time', now.toISOString())
      .lte('kickoff_time', in30.toISOString());

    if (matchError || !upcomingMatches?.length) return;

    // Fetch all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, subscription');

    if (subError || !subscriptions?.length) return;

    for (const match of upcomingMatches) {
      const payload = JSON.stringify({
        title: '⚽ Match Starting Soon!',
        body:  `${match.home_placeholder} vs ${match.away_placeholder} kicks off in 30 minutes!`,
        url:   '/matches',
      });

      const sends = subscriptions.map(async ({ id, subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err) {
          if (err.statusCode === 410) {
            // Subscription expired — remove it
            await supabase.from('push_subscriptions').delete().eq('id', id).catch(() => {});
          }
        }
      });

      await Promise.allSettled(sends);

      // Mark match as notified
      await supabase
        .from('matches')
        .update({ notification_sent: true })
        .eq('match_number', match.match_number);

      console.log(`[NotificationCron] Notified for match #${match.match_number}.`);
    }
  } catch (err) {
    console.error('[NotificationCron] Error:', err.message);
  }
}

// ── Schedule ────────────────────────────────────────────────
// Check every 5 minutes
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', () => {
    sendUpcomingMatchNotifications().catch((e) =>
      console.error('[NotificationCron]', e.message)
    );
  });
  console.log('[NotificationCron] Cron scheduled (every 5 min).');
}

module.exports = { sendUpcomingMatchNotifications };
