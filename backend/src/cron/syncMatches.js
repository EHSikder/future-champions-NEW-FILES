const cron = require('node-cron');
const supabase = require('../config/database');
const env = require('../config/env');
const {
  fetchSchedule,
  fetchLiveScores,
  parseEvent,
  getWinnerApiId,
  canonTeam,
} = require('../services/sportsDbApiService');
const { fetchEspnScoreboard, findCompletedWinnerName } = require('../services/espnService');

const API_KEY = env.THESPORTSDB_API_KEY;

// How long after a knockout match ties (penalties) before we start asking ESPN
// for the shootout winner — gives the shootout time to finish.
const PENALTY_WAIT_MIN = 10;

// A pair of teams can meet up to twice (group + knockout), so a pair alone is
// not a unique key — we disambiguate by date below.
const pairKey = (a, b) => [a, b].sort().join('|');

// Two games can share a DATE but never a kickoff TIME, so we disambiguate by
// matching the event's kickoff to a candidate's kickoff (small tolerance for
// minor feed differences). It NEVER guesses: if it can't confirm a match by
// time, it links nothing.
const KICKOFF_TOL_MS = 2 * 3600 * 1000; // 2h — well under the gap between same-day games
const closeTime = (a, b) => !!(a && b) && Math.abs(new Date(a) - new Date(b)) <= KICKOFF_TOL_MS;

/**
 * From the unlinked matches that share an event's team pair, pick the ONE it
 * belongs to by kickoff time (or null if unsure — never guess):
 *   • 1 candidate → if both have a time it must line up; a not-yet-scheduled
 *     match with no time is allowed (seeding);
 *   • 2+ candidates (teams meet in group AND knockout) → the one whose kickoff
 *     matches this event's time.
 */
function pickByTime(candidates, eventTime) {
  const list = (candidates || []).filter((c) => !c.thesportsdb_event_id);
  if (list.length === 0) return null;
  if (list.length === 1) {
    const c = list[0];
    if (c.kickoff_time && eventTime && !closeTime(c.kickoff_time, eventTime)) return null;
    return c;
  }
  return list.find((c) => closeTime(c.kickoff_time, eventTime)) || null;
}

/**
 * Decide a finished match's outcome and write it into `candidate`:
 *  • decisive full-time/extra-time score (or group stage) → finished + winner.
 *    (TheSportsDB's main score already includes extra-time goals.)
 *  • knockout level at full time → it went to penalties. We do NOT read any
 *    score from TheSportsDB for it (its penalty field is unreliable): the match
 *    is parked in 'penalties' with its level score, and the ESPN pass fills in
 *    the winner. No penalty score is stored.
 */
async function applyFinishedResult(parsed, match, candidate, ctx) {
  const isKnockout = match.round !== 'group_stage';
  const winnerUuid = await resolveTeam(getWinnerApiId(parsed), null, ctx);

  if (winnerUuid || !isKnockout) {
    if (winnerUuid) candidate.winner_team_id = winnerUuid;
    candidate.status = 'finished';
    return;
  }

  // Knockout, level → penalties. Hand off to ESPN; stop touching its score.
  candidate.status = 'penalties';
  if (match.status !== 'penalties') candidate.penalties_since = new Date().toISOString();
  console.warn(`[SyncMatches] Match ${match.match_number} level — penalties; winner via ESPN.`);
}

/**
 * For matches sitting in 'penalties', once the wait has elapsed, read the
 * shootout winner from ESPN (matched by team names + date) and finalize. One
 * ESPN call per date covers however many matches tied that day (dual matches).
 */
async function resolvePendingPenalties(ctx) {
  const { data: pens } = await supabase
    .from('matches')
    .select('id, match_number, status, kickoff_time, penalties_since, home:home_team_id(name), away:away_team_id(name)')
    .eq('status', 'penalties');
  if (!pens || !pens.length) return 0;

  let resolved = 0;
  const espnByDate = {};

  for (const m of pens) {
    // Start the clock the first time we see it pending.
    if (!m.penalties_since) {
      await supabase.from('matches').update({ penalties_since: new Date().toISOString() }).eq('id', m.id);
      continue;
    }
    // Give the shootout time to finish before asking ESPN; then retry each cycle.
    if ((Date.now() - new Date(m.penalties_since).getTime()) / 60000 < PENALTY_WAIT_MIN) continue;

    const homeName = m.home && m.home.name;
    const awayName = m.away && m.away.name;
    if (!homeName || !awayName) continue;

    // One ESPN call per date covers all matches that tied that day (dual matches).
    const dateStr = m.kickoff_time ? new Date(m.kickoff_time).toISOString().slice(0, 10).replace(/-/g, '') : '';
    if (!(dateStr in espnByDate)) {
      try { espnByDate[dateStr] = await fetchEspnScoreboard(dateStr || null); }
      catch (e) { console.warn('[SyncMatches] ESPN fetch failed:', e.message); espnByDate[dateStr] = []; }
    }

    const winnerName = findCompletedWinnerName(espnByDate[dateStr], homeName, awayName);
    if (!winnerName) continue; // not decided yet — retry next cycle

    const winnerUuid = await resolveTeam(null, winnerName, ctx);
    if (!winnerUuid) { console.warn(`[SyncMatches] ESPN penalty winner "${winnerName}" (match ${m.match_number}) not found in DB.`); continue; }

    // Set winner + finished only — leave the level score as-is (no penalty score).
    const { error } = await supabase.from('matches')
      .update({ winner_team_id: winnerUuid, status: 'finished', updated_at: new Date().toISOString() })
      .eq('id', m.id);
    if (error) { console.error('[SyncMatches] penalty finalize error:', error.message); continue; }
    console.log(`[SyncMatches] Match ${m.match_number} penalty winner: ${winnerName} (via ESPN).`);
    resolved++;
  }
  return resolved;
}

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
    // canonTeam folds accents/casing/aliases ("USA"↔"United States", etc.) so
    // names line up even when TheSportsDB spells a team differently than our DB.
    const t = ctx.teamByName.get(canonTeam(apiName));
    if (t) {
      if (apiId && !t.thesportsdb_id) {
        await supabase.from('teams').update({ thesportsdb_id: apiId }).eq('id', t.id);
        t.thesportsdb_id = apiId;
        ctx.teamByApiId.set(apiId, t);
      }
      return t.id;
    }
    // Couldn't match — record it (name + id) so the run logs exactly which
    // teams need a manual thesportsdb_id, instead of a silent "unlinked" count.
    if (ctx.unresolved && apiId) ctx.unresolved.set(apiName, apiId);
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
  // 1) Exact, by stored event id.
  if (parsed.eventId && ctx.matchByEventId.has(parsed.eventId)) {
    return ctx.matchByEventId.get(parsed.eventId);
  }
  if (!homeUuid || !awayUuid) return null;

  // 2) Team-pair fallback, disambiguated by kickoff time so a stray/duplicate
  //    event can't hijack the wrong match (and teams meeting twice resolve).
  const m = pickByTime(ctx.matchByPair.get(pairKey(homeUuid, awayUuid)), parsed.kickoffTime);
  if (!m) return null;

  if (parsed.eventId && !m.thesportsdb_event_id) {
    await supabase.from('matches').update({ thesportsdb_event_id: parsed.eventId }).eq('id', m.id);
    m.thesportsdb_event_id = parsed.eventId;
    ctx.matchByEventId.set(parsed.eventId, m);
  }
  return m;
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
    if (t.name)           teamByName.set(canonTeam(t.name), t);
  });

  const { data: matches } = await supabase
    .from('matches')
    .select('id, match_number, round, thesportsdb_event_id, kickoff_time, home_team_id, away_team_id, home_placeholder, away_placeholder, status, home_score, away_score, winner_team_id');

  const matchByEventId = new Map();
  const matchByPair    = new Map();   // pairKey → [matches] (teams can meet twice)
  (matches || []).forEach(m => {
    if (m.thesportsdb_event_id) matchByEventId.set(String(m.thesportsdb_event_id), m);
    if (m.home_team_id && m.away_team_id) {
      const k = pairKey(m.home_team_id, m.away_team_id);
      if (!matchByPair.has(k)) matchByPair.set(k, []);
      matchByPair.get(k).push(m);
    }
  });

  return { teamByApiId, teamByName, matchByEventId, matchByPair, unresolved: new Map() };
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

      // Once finished OR sent to penalties, freeze it — don't let TheSportsDB
      // overwrite the result (penalties are resolved by the ESPN pass).
      if (match.status === 'finished' || match.status === 'penalties') continue;

      const candidate = {};

      // Kickoff — compare by time value (string compare would always differ).
      if (parsed.kickoffTime &&
          new Date(parsed.kickoffTime).getTime() !== new Date(match.kickoff_time || 0).getTime()) {
        candidate.kickoff_time = parsed.kickoffTime;
      }

      // Fill teams only when the slot is empty — never overwrite (a knockout's
      // teams come from bracket advancement / the group draw, and overwriting
      // would let a mis-linked event corrupt them).
      if (homeUuid && !match.home_team_id) candidate.home_team_id = homeUuid;
      if (awayUuid && !match.away_team_id) candidate.away_team_id = awayUuid;
      if (parsed.homeTeamName && parsed.homeTeamName !== match.home_placeholder) candidate.home_placeholder = parsed.homeTeamName;
      if (parsed.awayTeamName && parsed.awayTeamName !== match.away_placeholder) candidate.away_placeholder = parsed.awayTeamName;

      // Finished results come from the schedule (in-play scores come from the
      // livescore pass). Record the final score, then resolve the outcome
      // (decisive / extra-time / penalties) via applyFinishedResult.
      if (parsed.status === 'finished') {
        if (parsed.homeScore != null) candidate.home_score = parsed.homeScore;
        if (parsed.awayScore != null) candidate.away_score = parsed.awayScore;
        await applyFinishedResult(parsed, match, candidate, ctx);
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
      if (match.status === 'finished' || match.status === 'penalties') continue; // frozen; penalties resolved by ESPN pass

      const candidate = {};
      if (parsed.homeScore != null) candidate.home_score = parsed.homeScore;
      if (parsed.awayScore != null) candidate.away_score = parsed.awayScore;

      if (parsed.status === 'finished') {
        await applyFinishedResult(parsed, match, candidate, ctx);
      } else {
        candidate.status = parsed.status;
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

    // 3) Resolve penalty-shootout winners via ESPN (only for knockout matches
    //    that tied and have waited out the shootout). Safe with dual matches —
    //    one ESPN call per date covers all of them.
    try {
      const n = await resolvePendingPenalties(ctx);
      if (n) matchesUpdated += n;
    } catch (err) {
      console.error('[SyncMatches] Penalty resolution failed:', err.message);
    }

    // Name the exact teams we couldn't match, so you can map them once:
    //   UPDATE teams SET thesportsdb_id = '<id>' WHERE name = '<your team name>';
    if (ctx.unresolved.size) {
      const list = [...ctx.unresolved.entries()].map(([name, id]) => `"${name}" (id ${id})`).join(', ');
      console.warn(`[SyncMatches] ${ctx.unresolved.size} TheSportsDB team(s) didn't match any DB team — set their thesportsdb_id: ${list}`);
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
