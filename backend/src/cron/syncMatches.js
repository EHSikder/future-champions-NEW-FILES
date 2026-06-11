const cron = require('node-cron');
const supabase = require('../config/database');
const {
  fetchAllFixtures,
  fetchLiveScores,
  parseFixture,
  parseLiveScore,
  getWinnerApiId,
} = require('../services/worldCupApiService');

const API_KEY = process.env.WORLDCUP_API_KEY || process.env.API_FOOTBALL_KEY || '';

/**
 * Look up the internal UUID for a team by its worldcupapi_id.
 * Returns null if no match is found.
 */
async function resolveTeamUuid(apiTeamId) {
  if (!apiTeamId) return null;

  const { data, error } = await supabase
    .from('teams')
    .select('id')
    .eq('worldcupapi_id', apiTeamId)
    .single();

  if (error || !data) return null;
  return data.id;
}

/**
 * Core sync logic — fetches fixtures + live scores from WorldCupAPI
 * and upserts them into the matches table.
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

    // ── 1. Sync fixtures (scheduled matches) ──────────────────
    let fixtures = [];
    try {
      fixtures = await fetchAllFixtures();
      console.log(`[SyncMatches] Fetched ${fixtures.length} fixtures from API.`);
    } catch (err) {
      console.error('[SyncMatches] Failed to fetch fixtures:', err.message);
    }

    for (const raw of fixtures) {
      try {
        const parsed = parseFixture(raw);

        const homeTeamId = await resolveTeamUuid(parsed.homeTeamApiId);
        const awayTeamId = await resolveTeamUuid(parsed.awayTeamApiId);

        // Find the match in our DB by worldcupapi_fixture_id
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id, match_number')
          .eq('worldcupapi_fixture_id', parsed.fixtureId)
          .single();

        if (existingMatch) {
          // Update existing match
          const updates = {
            kickoff_time: parsed.kickoffTime,
            updated_at: new Date().toISOString(),
          };
          if (homeTeamId) updates.home_team_id = homeTeamId;
          if (awayTeamId) updates.away_team_id = awayTeamId;
          if (raw.home?.name) updates.home_placeholder = raw.home.name;
          if (raw.away?.name) updates.away_placeholder = raw.away.name;

          const { error } = await supabase
            .from('matches')
            .update(updates)
            .eq('id', existingMatch.id);

          if (error) {
            console.error('[SyncMatches] Update error for fixture', parsed.fixtureId, error.message);
          } else {
            matchesUpdated++;
          }
        }
        // Note: we don't auto-create matches from the API because match_number
        // and round are set manually in the database schema
      } catch (err) {
        console.error('[SyncMatches] Error processing fixture:', err.message);
      }
    }

    // ── 2. Sync live scores ───────────────────────────────────
    let liveMatches = [];
    try {
      liveMatches = await fetchLiveScores();
      console.log(`[SyncMatches] Fetched ${liveMatches.length} live matches from API.`);
    } catch (err) {
      console.error('[SyncMatches] Failed to fetch live scores:', err.message);
    }

    for (const raw of liveMatches) {
      try {
        const parsed = parseLiveScore(raw);

        // Find the match by worldcupapi_fixture_id
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id, match_number, status')
          .eq('worldcupapi_fixture_id', parsed.fixtureId)
          .single();

        if (!existingMatch) {
          console.warn(`[SyncMatches] No DB match for fixture_id ${parsed.fixtureId} — skipping.`);
          continue;
        }

        const winnerApiId = getWinnerApiId(parsed);
        const winnerTeamId = await resolveTeamUuid(winnerApiId);

        const updates = {
          status: parsed.status,
          home_score: parsed.homeScore,
          away_score: parsed.awayScore,
          home_extra_time_score: parsed.homeExtraTimeScore,
          away_extra_time_score: parsed.awayExtraTimeScore,
          home_penalty_score: parsed.homePenaltyScore,
          away_penalty_score: parsed.awayPenaltyScore,
          updated_at: new Date().toISOString(),
        };

        if (winnerTeamId) updates.winner_team_id = winnerTeamId;

        const { error } = await supabase
          .from('matches')
          .update(updates)
          .eq('id', existingMatch.id);

        if (error) {
          console.error('[SyncMatches] Live update error for match', existingMatch.match_number, error.message);
        } else {
          matchesUpdated++;
        }
      } catch (err) {
        console.error('[SyncMatches] Error processing live match:', err.message);
      }
    }

    // ── 3. Log successful sync ────────────────────────────────
    // sync_log schema: status IN ('running','completed','failed'), column is `errors` not `error_message`
    const { error: logError } = await supabase.from('sync_log').insert({
      started_at:      startedAt,
      completed_at:    new Date().toISOString(),
      status:          'completed',
      matches_updated: matchesUpdated,
    });
    if (logError) console.error('[SyncMatches] Failed to write sync_log:', logError.message);

    console.log(`[SyncMatches] Done — ${matchesUpdated} matches updated.`);
  } catch (err) {
    console.error('[SyncMatches] Sync failed:', err.message);

    // Log failed sync — wrapped in try/catch because Supabase thenable
    // does not have a .catch() method in v2
    try {
      await supabase.from('sync_log').insert({
        started_at:   startedAt,
        completed_at: new Date().toISOString(),
        status:       'failed',
        errors:       err.message,
      });
    } catch (_) {
      // ignore logging failures
    }
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
