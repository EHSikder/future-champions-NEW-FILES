'use client';
import { useState, useEffect } from 'react';

// Score → outcome. A knockout match can never end in a draw, so when the
// predicted score is level in a knockout we keep the user's explicit "who
// advances" pick (home/away) instead of forcing 'draw'. Group stage keeps the
// old behaviour (equal score = draw).
function deriveWinner(homeScore, awayScore, isKnockout, prevWinner) {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  // Knockout can't be a draw — keep the existing advancer pick, else default to
  // 'home' (the "who advances" picker lets the user switch). Never 'draw'/null.
  if (isKnockout) return (prevWinner === 'home' || prevWinner === 'away') ? prevWinner : 'home';
  return 'draw';
}

export default function MatchCard({ match, prediction, onPredictionChange }) {
  const [isLockedLocal, setIsLockedLocal] = useState(false);

  useEffect(() => {
    if (match.kickoff_time) {
      const check = () => {
        const diffMinutes = (new Date(match.kickoff_time) - Date.now()) / 1000 / 60;
        if (diffMinutes <= 5 || match.status !== 'scheduled') setIsLockedLocal(true);
      };
      check();
      const interval = setInterval(check, 60_000);
      return () => clearInterval(interval);
    }
  }, [match.kickoff_time, match.status]);

  const isLocked = prediction?.isLocked || isLockedLocal || match.status !== 'scheduled';
  const isKnockout = !!match.round && match.round !== 'group_stage';
  const isFinished = match.status === 'finished';
  const isLive = ['live', 'halftime', 'extra_time', 'penalties'].includes(match.status);
  const showScore = ['live', 'halftime', 'extra_time', 'penalties', 'finished'].includes(match.status);

  const homeTeamName = match.home_team?.name || match.home_placeholder || 'TBD';
  const awayTeamName = match.away_team?.name || match.away_placeholder || 'TBD';
  const homeFlag = match.home_team?.flag_url || null;
  const awayFlag = match.away_team?.flag_url || null;

  // Has the user touched this match's prediction at all yet?
  const hasPrediction = prediction !== undefined && prediction !== null;
  const winner = prediction?.winner; // 'home' | 'away' | 'draw' | undefined

  const updateScore = (side, delta) => {
    if (isLocked || !match.home_team || !match.away_team) return;

    const currentHome = parseInt(prediction?.homeScore ?? 0, 10);
    const currentAway = parseInt(prediction?.awayScore ?? 0, 10);

    const newHome = side === 'home' ? Math.max(0, currentHome + delta) : currentHome;
    const newAway = side === 'away' ? Math.max(0, currentAway + delta) : currentAway;
    const newWinner = deriveWinner(newHome, newAway, isKnockout, prediction?.winner);

    onPredictionChange(match.match_number, side === 'home' ? 'homeScore' : 'awayScore', side === 'home' ? newHome : newAway);
    onPredictionChange(match.match_number, 'winner', newWinner);
  };

  // In a knockout, picking who advances when the score is level.
  const pickAdvancer = (side) => {
    if (isLocked) return;
    onPredictionChange(match.match_number, 'winner', side);
  };
  const scoreIsLevel = (prediction?.homeScore ?? 0) === (prediction?.awayScore ?? 0);

  // "SET 0-0" — only relevant the very first time, before any prediction
  // exists for this match. Disappears the moment the user touches a
  // +/- button (hasPrediction becomes true) or uses this button itself.
  const showSetZeroDraw = !isLocked && !hasPrediction && !isKnockout && match.home_team && match.away_team;

  const handleSetZeroDraw = () => {
    if (isLocked || hasPrediction) return;
    onPredictionChange(match.match_number, 'homeScore', 0);
    onPredictionChange(match.match_number, 'awayScore', 0);
    onPredictionChange(match.match_number, 'winner', 'draw');
  };

  const pts = prediction?.pointsEarned;
  const hasPts = isFinished && typeof pts === 'number' && pts > 0;

  const getStatusBadge = () => {
    if (isLive) return { label: '● LIVE', color: '#FF4466' };
    if (isFinished) return { label: 'FINISHED', color: 'var(--color-text-muted)' };
    if (isLocked && !isFinished) return { label: '🔒 LOCKED', color: 'var(--color-vibrant-orange)' };
    return null;
  };
  const badge = getStatusBadge();

  const kickoff = match.kickoff_time
    ? new Date(match.kickoff_time).toLocaleString('en-GB', {
        timeZone: 'Asia/Kuwait',
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'TBD';

  // Show the prediction score box when:
  //  - match is still open (always show, default 0-0, editable), OR
  //  - match is locked/live/finished AND the user actually has a saved prediction
  const showPredictionBox = !isLocked || (isLocked && hasPrediction);

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: `1px solid ${isLocked && !isFinished ? 'rgba(255,100,0,0.3)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
      marginBottom: 'var(--space-3)',
      transition: 'all 0.2s',
      opacity: isLocked && !isFinished && !isLive ? 0.75 : 1,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top bar: match info + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>
            #{match.match_number}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{kickoff}</span>
          {match.venue && (
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>📍 {match.city}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {badge && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
              color: badge.color,
              ...(isLive ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
            }}>{badge.label}</span>
          )}
          {hasPts && (
            <span style={{
              background: 'var(--gradient-blue-cyan)', color: '#000',
              fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px',
              borderRadius: 'var(--radius-full)', letterSpacing: '0.05em',
            }}>+{pts} pts</span>
          )}
        </div>
      </div>

      {/* Live / final score */}
      {showScore && (
        <div style={{
          textAlign: 'center', marginBottom: 'var(--space-3)',
          fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.1em',
          background: isLive ? 'var(--gradient-orange-fire)' : 'var(--gradient-blue-cyan)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {match.home_score ?? 0} — {match.away_score ?? 0}
        </div>
      )}

      {/* Teams row — display only, no longer clickable.
          Outcome (highlight) is driven entirely by the score below. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        {/* Home team */}
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-2)',
            background: winner === 'home' ? 'rgba(0,150,255,0.15)' : 'var(--color-surface-3)',
            border: `1px solid ${winner === 'home' ? '#0096FF' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            transition: 'all 0.2s',
            boxShadow: winner === 'home' ? 'var(--glow-blue)' : 'none',
          }}
        >
          {homeFlag
            ? <img src={homeFlag} alt={homeTeamName} style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 3 }} />
            : <div style={{ width: 40, height: 28, background: 'var(--color-surface-4)', borderRadius: 3 }} />
          }
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
            {homeTeamName}
          </span>
        </div>

        {/* vs / draw indicator (read-only label, reflects the score) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-hero)', fontSize: '1.5rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>VS</span>
          {winner === 'draw' && !isKnockout && (
            <span style={{
              padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(255,100,0,0.2)',
              border: '1px solid #FF6400',
              borderRadius: 'var(--radius-full)', color: '#FF6400',
            }}>
              DRAW
            </span>
          )}
        </div>

        {/* Away team */}
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-2)',
            background: winner === 'away' ? 'rgba(0,150,255,0.15)' : 'var(--color-surface-3)',
            border: `1px solid ${winner === 'away' ? '#0096FF' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            transition: 'all 0.2s',
            boxShadow: winner === 'away' ? 'var(--glow-blue)' : 'none',
          }}
        >
          {awayFlag
            ? <img src={awayFlag} alt={awayTeamName} style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 3 }} />
            : <div style={{ width: 40, height: 28, background: 'var(--color-surface-4)', borderRadius: 3 }} />
          }
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
            {awayTeamName}
          </span>
        </div>
      </div>

      {/* Score prediction — the ONLY way to set a prediction now.
          Editable while open, read-only once locked/live/finished. */}
      {showPredictionBox && (
        <div style={{
          background: 'var(--color-surface-3)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)', border: '1px solid rgba(0,150,255,0.15)',
        }}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--color-cyan)', textTransform: 'uppercase',
            textAlign: 'center', marginBottom: 'var(--space-3)',
          }}>
            {isLocked ? 'YOUR PREDICTED SCORE' : '⚡ PREDICT THE SCORE (+10 BONUS PTS)'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
            {/* Home score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {!isLocked && (
                <button
                  onClick={() => updateScore('home', -1)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                    color: '#fff', cursor: 'pointer', fontSize: '1.2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
              )}
              <span style={{
                fontFamily: 'var(--font-hero)', fontSize: '2rem',
                background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                minWidth: 32, textAlign: 'center', letterSpacing: '0.05em',
              }}>{prediction?.homeScore ?? 0}</span>
              {!isLocked && (
                <button
                  onClick={() => updateScore('home', 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                    color: '#fff', cursor: 'pointer', fontSize: '1.2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              )}
            </div>

            <span style={{ fontFamily: 'var(--font-hero)', fontSize: '1.5rem', color: 'var(--color-text-muted)' }}>–</span>

            {/* Away score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {!isLocked && (
                <button
                  onClick={() => updateScore('away', -1)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                    color: '#fff', cursor: 'pointer', fontSize: '1.2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
              )}
              <span style={{
                fontFamily: 'var(--font-hero)', fontSize: '2rem',
                background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                minWidth: 32, textAlign: 'center', letterSpacing: '0.05em',
              }}>{prediction?.awayScore ?? 0}</span>
              {!isLocked && (
                <button
                  onClick={() => updateScore('away', 1)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                    color: '#fff', cursor: 'pointer', fontSize: '1.2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              )}
            </div>
          </div>

          {/* Knockout, level score → no draws: user must pick who advances. */}
          {!isLocked && isKnockout && scoreIsLevel && match.home_team && match.away_team && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
              <div style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
                color: 'var(--color-vibrant-orange)', textTransform: 'uppercase', marginBottom: 'var(--space-2)',
              }}>
                Level score — who advances? (no draws in knockouts)
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                {[['home', homeTeamName], ['away', awayTeamName]].map(([side, label]) => (
                  <button
                    key={side}
                    onClick={() => pickAdvancer(side)}
                    style={{
                      flex: 1, maxWidth: 160, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      border: winner === side ? '2px solid #0096FF' : '1px solid var(--color-border)',
                      background: winner === side ? 'rgba(0,150,255,0.15)' : 'var(--color-surface-4)',
                      color: '#fff',
                    }}
                  >
                    {label} advances
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SET 0-0 — only before the user has made any prediction at all */}
          {showSetZeroDraw && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
              <button
                onClick={handleSetZeroDraw}
                style={{
                  padding: '6px 16px', fontSize: '0.72rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: 'rgba(255,100,0,0.12)',
                  border: '1px solid rgba(255,100,0,0.4)',
                  borderRadius: 'var(--radius-full)', color: '#FF8A3D',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                SET 0–0
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
