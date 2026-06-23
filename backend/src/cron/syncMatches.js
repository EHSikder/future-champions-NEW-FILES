const cron = require('node-cron');
const supabase = require('../config/database');
const env = require('../config/env');
const {
  fetchSchedule,
  fetchLiveScores,
  parseEvent,
  getWinnerApiId,
} = require('../services/sportsDbApiService');

const API_KEY = env.THESPORTSDB_API_KEY;

// A pair of teams meets at most once in the tournament, so a sorted
// "uuidA|uuidB" key uniquely identifies a match by its two teams.
const pairKey = (a, b) => [a, b].sort().join('|');

/**
 * Resolve a TheSportsDB team id → our team UUID.
 *  1) by teams.thesportsdb_id (fast path once seeded)
 *  2) by case-insensitive name match — and SELF-HEAL by storing the id, so the
 *     next sync uses the fast path. This means you never have to hand-enter
 *     team ids; national-team names are stable enough to seed from.
 */
async function resolveTeam(apiId, apiName, ctx) {
  if (apiId && ctx.teamByApiId.has(apiId)) return ctx.teamByApiId.get(apiId).id;

  if (apiName) {
    const t = ctx.teamByName.get(apiName.trim().toLowerCase());
    if (t) {
      if (apiId && !t.thesportsdb_id) {
        await supabase.from('teams').update({ thesportsdb_id: apiId }).eq('id', t.id);
        t.thesportsdb_id = apiId;
        ctx.teamByApiId.set(apiId, t);
      }
      return t.id;
    }
  }
  return null;
}

/**
 * Link an API event → our match row.
 *  1) by matches.thesportsdb_event_id (preferred — exact)
 *  2) by team pair (auto-links group-stage matches once both teams resolve) and
 *     SELF-HEALs the event id for future runs. For knockout matches whose teams
 *     aren't populated yet, set matches.thesportsdb_event_id manually for an
 *     exact link.
 */
async function linkMatch(parsed, homeUuid, awayUuid, ctx) {
  if (parsed.eventId && ctx.matchByEventId.has(parsed.eventId)) {
    return ctx.matchByEventId.get(parsed.eventId);
  }
  if (homeUuid && awayUuid) {
    const m = ctx.matchByPair.get(pairKey(homeUuid, awayUuid));
    if (m) {
      if (parsed.eventId && !m.thesportsdb_event_id) {
        await supabase.from('matches').update({ thesportsdb_event_id: parsed.eventId }).eq('id', m.id);
        m.thesportsdb_event_id = parsed.eventId;
        ctx.matchByEventId.set(parsed.eventId, m);
      }
      return m;
    }
  }
  return null;
}

/**
 * Write ONLY the columns whose value actually changed, then mirror them onto
 * the in-memory row so later events in the same run diff correctly. Skipping
 * unchanged writes avoids needless updated_at bumps + Supabase realtime events.
 */
async function applyUpdates(match, candidate) {
  const updates = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (v !== undefined && v !== match[k]) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) return false;

  updates.updated_at = new Date().toISOString();
  const { error } = await supabase.from('matches').update(updates).eq('id', match.id);
  if (error) {
    console.error('[SyncMatches] Update error for match', match.match_number, error.message);
    return false;
  }
  Object.assign(match, updates);
  return true;
}

/** Load teams + matches once into lookup maps to avoid per-event SELECTs. */
async function buildContext() {
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, thesportsdb_id');

  const teamByApiId = new Map();
  const teamByName  = new Map();
  (teams || []).forEach(t => {
    if (t.thesportsdb_id) teamByApiId.set(String(t.thesportsdb_id), t);
    if (t.name)           teamByName.set(t.name.trim().toLowerCase(), t);
  });

  const { data: matches } = await supabase
    .from('matches')
    .select('id, match_number, round, thesportsdb_event_id, kickoff_time, home_team_id, away_team_id, home_placeholder, away_placeholder, status, home_score, away_score, winner_team_id');

  const matchByEventId = new Map();
  const matchByPair    = new Map();
  (matches || []).forEach(m => {
    if (m.thesportsdb_event_id) matchByEventId.set(String(m.thesportsdb_event_id), m);
    if (m.home_team_id && m.away_team_id) matchByPair.set(pairKey(m.home_team_id, m.away_team_id), m);
  });

  return { teamByApiId, teamByName, matchByEventId, matchByPair };
}

/** Schedule events → fixtures (kickoff/teams) + final results when played. */
async function syncFromSchedule(events, ctx) {
  let updated = 0, unlinked = 0;

  for (const ev of events) {
    try {
      const parsed = parseEvent(ev);
      if (!parsed.eventId) continue;

      const homeUuid = await resolveTeam(parsed.homeTeamApiId, parsed.homeTeamName, ctx);
      const awayUuid = await resolveTeam(parsed.awayTeamApiId, parsed.awayTeamName, ctx);
      const match    = await linkMatch(parsed, homeUuid, awayUuid, ctx);
      if (!match) { unlinked++; continue; }

      // Once recorded finished, freeze it: don't let a stale feed (or a penalty
      // shootout we can only read as a level score) overwrite a final result or
      // an admin-set winner, and don't re-fire the scoring trigger.
      if (match.status === 'finished') continue;

      const candidate = {};

      // Kickoff — compare by time value (string compare would always differ).
      if (parsed.kickoffTime &&
          new Date(parsed.kickoffTime).getTime() !== new Date(match.kickoff_time || 0).getTime()) {
        candidate.kickoff_time = parsed.kickoffTime;
      }

      if (homeUuid && homeUuid !== match.home_team_id) candidate.home_team_id = homeUuid;
      if (awayUuid && awayUuid !== match.away_team_id) candidate.away_team_id = awayUuid;
      if (parsed.homeTeamName && parsed.homeTeamName !== match.home_placeholder) candidate.home_placeholder = parsed.homeTeamName;
      if (parsed.awayTeamName && parsed.awayTeamName !== match.away_placeholder) candidate.away_placeholder = parsed.awayTeamName;

      // Only touch score/status/winner once the match is actually finished, so
      // setting status='finished' (with winner + scores already in the same
      // write) cleanly fires the DB scoring trigger.
      if (parsed.status === 'finished') {
        if (parsed.homeScore != null) candidate.home_score = parsed.homeScore;
        if (parsed.awayScore != null) candidate.away_score = parsed.awayScore;

        const winnerUuid = await resolveTeam(getWinnerApiId(parsed), null, ctx);
        if (winnerUuid) candidate.winner_team_id = winnerUuid;
        candidate.status = 'finished';

        if (!winnerUuid && parsed.homeScore === parsed.awayScore && match.round !== 'group_stage') {
          console.warn(`[SyncMatches] Match ${match.match_number} finished level ${parsed.homeScore}-${parsed.awayScore} — decided on penalties; set winner_team_id manually.`);
        }
      }

      if (await applyUpdates(match, candidate)) updated++;
    } catch (err) {
      console.error('[SyncMatches] Error processing schedule event:', err.message);
    }
  }

  return { updated, unlinked };
}

/** Livescore events → real-time status + score (no kickoff/team rewrites). */
async function syncFromLive(events, ctx) {
  let updated = 0;

  for (const ev of events) {
    try {
      const parsed = parseEvent(ev);
      if (!parsed.eventId) continue;

      const homeUuid = await resolveTeam(parsed.homeTeamApiId, parsed.homeTeamName, ctx);
      const awayUuid = await resolveTeam(parsed.awayTeamApiId, parsed.awayTeamName, ctx);
      const match    = await linkMatch(parsed, homeUuid, awayUuid, ctx);
      if (!match) continue;
      if (match.status === 'finished') continue; // frozen once final

      const candidate = { status: parsed.status };
      if (parsed.homeScore != null) candidate.home_score = parsed.homeScore;
      if (parsed.awayScore != null) candidate.away_score = parsed.awayScore;

      if (parsed.status === 'finished') {
        const winnerUuid = await resolveTeam(getWinnerApiId(parsed), null, ctx);
        if (winnerUuid) candidate.winner_team_id = winnerUuid;
      }

      if (await applyUpdates(match, candidate)) updated++;
    } catch (err) {
      console.error('[SyncMatches] Error processing live event:', err.message);
    }
  }

  return { updated };
}

/**
 * Core sync — pulls the season schedule + livescores from TheSportsDB and
 * updates the matches table. Exported so the admin route can trigger it.
 */
async function runSync() {
  const startedAt = new Date().toISOString();
  let matchesUpdated = 0;

  try {
    if (!API_KEY) {
      console.warn('[SyncMatches] THESPORTSDB_API_KEY not set — skipping sync.');
      return;
    }

    console.log('[SyncMatches] Starting TheSportsDB sync…');
    const ctx = await buildContext();

    // 1) Schedule — fixtures + final results.
    try {
      const events = await fetchSchedule();
      console.log(`[SyncMatches] Fetched ${events.length} schedule events.`);
      const { updated, unlinked } = await syncFromSchedule(events, ctx);
      matchesUpdated += updated;
      if (unlinked) console.warn(`[SyncMatches] ${unlinked} schedule events could not be linked to a match (set thesportsdb_event_id for those).`);
    } catch (err) {
      console.error('[SyncMatches] Schedule fetch failed:', err.message);
    }

    // 2) Livescores — real-time in-play updates.
    try {
      const events = await fetchLiveScores();
      console.log(`[SyncMatches] Fetched ${events.length} live events.`);
      const { updated } = await syncFromLive(events, ctx);
      matchesUpdated += updated;
    } catch (err) {
      console.error('[SyncMatches] Livescore fetch failed:', err.message);
    }

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
    try {
      await supabase.from('sync_log').insert({
        started_at:   startedAt,
        completed_at: new Date().toISOString(),
        status:       'failed',
        errors:       err.message,
      });
    } catch (_) { /* ignore logging failures */ }
  }
}

// ── Schedule: every 5 minutes (skipped silently if the API key is missing) ──
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', () => {
    runSync().catch((e) => console.error('[SyncMatches cron]', e.message));
  });
  console.log('[SyncMatches] Cron scheduled (every 5 min).');
}

module.exports = { runSync };
