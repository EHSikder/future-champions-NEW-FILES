const cron = require('node-cron');
const axios = require('axios');
const supabase = require('../config/database');

const API_BASE = process.env.WORLDCUP_API_BASE_URL || 'https://api.football-data.org/v4';
const API_KEY  = process.env.WORLDCUP_API_KEY || '';
// FIFA World Cup 2026 competition ID on football-data.org
const COMPETITION_ID = process.env.WORLDCUP_COMPETITION_ID || 'WC';

/**
 * Map an API-Football match status string to our internal status enum.
 */
function mapStatus(apiStatus) {
  const map = {
    SCHEDULED: 'scheduled',
    TIMED: 'scheduled',
    IN_PLAY: 'live',
    PAUSED: 'halftime',
    FINISHED: 'finished',
    SUSPENDED: 'postponed',
    POSTPONED: 'postponed',
    CANCELLED: 'postponed',
    AWARDED: 'finished',
  };
  return map[apiStatus] || 'scheduled';
}

/**
 * Core sync logic — fetches matches from the API and upserts them.
 * Exported so the admin route can trigger it manually.
 */
async function runSync() {
  const startedAt = new Date().toISOString();
  let matchesUpdated = 0;

  try {
    console.log('[SyncMatches] Starting sync…');

    if (!API_KEY) {
      console.warn('[SyncMatches] WORLDCUP_API_KEY not set — skipping sync.');
      return;
    }

    const { data: apiData } = await axios.get(
      `${API_BASE}/competitions/${COMPETITION_ID}/matches`,
      { headers: { 'X-Auth-Token': API_KEY }, timeout: 10_000 }
    );

    const matches = apiData?.matches || [];
    console.log(`[SyncMatches] Fetched ${matches.length} matches from API.`);

    for (const m of matches) {
      const payload = {
        api_match_id:    String(m.id),
        match_number:    m.matchday || m.id,
        round:           (m.stage || 'group_stage').toLowerCase().replace(/ /g, '_'),
        kickoff_time:    m.utcDate,
        status:          mapStatus(m.status),
        home_team_id:    m.homeTeam?.id ? String(m.homeTeam.id) : null,
        away_team_id:    m.awayTeam?.id ? String(m.awayTeam.id) : null,
        home_placeholder: m.homeTeam?.name || null,
        away_placeholder: m.awayTeam?.name || null,
        home_score:      m.score?.fullTime?.home ?? null,
        away_score:      m.score?.fullTime?.away ?? null,
        home_score_ht:   m.score?.halfTime?.home ?? null,
        away_score_ht:   m.score?.halfTime?.away ?? null,
        updated_at:      new Date().toISOString(),
      };

      const { error } = await supabase
        .from('matches')
        .upsert(payload, { onConflict: 'api_match_id' });

      if (error) {
        console.error('[SyncMatches] Upsert error for match', m.id, error.message);
      } else {
        matchesUpdated++;
      }
    }

    // Log successful sync
    await supabase.from('sync_log').insert({
      started_at:      startedAt,
      completed_at:    new Date().toISOString(),
      status:          'success',
      matches_updated: matchesUpdated,
    });

    console.log(`[SyncMatches] Done — ${matchesUpdated} matches upserted.`);
  } catch (err) {
    console.error('[SyncMatches] Sync failed:', err.message);

    await supabase.from('sync_log').insert({
      started_at:   startedAt,
      completed_at: new Date().toISOString(),
      status:       'error',
      error_message: err.message,
    }).catch(() => {});
  }
}

// ── Schedule ────────────────────────────────────────────────
// Every 5 minutes during live periods; cron is skipped silently if env vars missing
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', () => {
    runSync().catch((e) => console.error('[SyncMatches cron]', e.message));
  });
  console.log('[SyncMatches] Cron scheduled (every 5 min).');
}

module.exports = { runSync };
