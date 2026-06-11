'use client';
import { useState, useEffect } from 'react';

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
  const isFinished = match.status === 'finished';
  const isLive = ['live', 'halftime', 'extra_time', 'penalties'].includes(match.status);
  const showScore = ['live', 'halftime', 'extra_time', 'penalties', 'finished'].includes(match.status);

  const homeTeamName = match.home_team?.name || match.home_placeholder || 'TBD';
  const awayTeamName = match.away_team?.name || match.away_placeholder || 'TBD';
  const homeFlag = match.home_team?.flag_url || null;
  const awayFlag = match.away_team?.flag_url || null;
  const isKnockout = ['round_of_32','round_of_16','quarterfinal','semifinal','third_place','final'].includes(match.round);

  const handleWinnerClick = (side) => {
    if (isLocked || !match.home_team || !match.away_team) return;
    const newWinner = prediction?.winner === side ? undefined : side;
    onPredictionChange(match.match_number, 'winner', newWinner);
  };

  const updateScore = (side, delta) => {
    if (isLocked) return;
    const field = side === 'home' ? 'homeScore' : 'awayScore';
    const current = parseInt(prediction?.[field] ?? 0, 10);
    onPredictionChange(match.match_number, field, Math.max(0, current + delta));
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

    ? new Date(match.kickoff_time).toLocaleString('en-GB', {
        timeZone: 'Asia/Kuwait',
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'TBD';

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

      {/* Live score */}
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

      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        {/* Home team */}
        <button
          onClick={() => handleWinnerClick('home')}
          disabled={isLocked || !match.home_team}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-2)',
            background: prediction?.winner === 'home' ? 'rgba(0,150,255,0.15)' : 'var(--color-surface-3)',
            border: `1px solid ${prediction?.winner === 'home' ? '#0096FF' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)', cursor: isLocked ? 'default' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: prediction?.winner === 'home' ? 'var(--glow-blue)' : 'none',
          }}
        >
          {homeFlag
            ? <img src={homeFlag} alt={homeTeamName} style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 3 }} />
            : <div style={{ width: 40, height: 28, background: 'var(--color-surface-4)', borderRadius: 3 }} />
          }
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
            {homeTeamName}
          </span>
        </button>

        {/* vs / Draw */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-hero)', fontSize: '1.5rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>VS</span>
          {!isKnockout && match.home_team && match.away_team && (
            <button
              onClick={() => handleWinnerClick('draw')}
              disabled={isLocked}
              style={{
                padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                background: prediction?.winner === 'draw' ? 'rgba(255,100,0,0.2)' : 'transparent',
                border: `1px solid ${prediction?.winner === 'draw' ? '#FF6400' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-full)', color: prediction?.winner === 'draw' ? '#FF6400' : 'var(--color-text-muted)',
                cursor: isLocked ? 'default' : 'pointer', transition: 'all 0.2s',
              }}
            >
              DRAW
            </button>
          )}
        </div>

        {/* Away team */}
        <button
          onClick={() => handleWinnerClick('away')}
          disabled={isLocked || !match.away_team}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-2)',
            background: prediction?.winner === 'away' ? 'rgba(0,150,255,0.15)' : 'var(--color-surface-3)',
            border: `1px solid ${prediction?.winner === 'away' ? '#0096FF' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)', cursor: isLocked ? 'default' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: prediction?.winner === 'away' ? 'var(--glow-blue)' : 'none',
          }}
        >
          {awayFlag
            ? <img src={awayFlag} alt={awayTeamName} style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 3 }} />
            : <div style={{ width: 40, height: 28, background: 'var(--color-surface-4)', borderRadius: 3 }} />
          }
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
            {awayTeamName}
          </span>
        </button>
      </div>

      {/* Score prediction */}
      {!isFinished && prediction?.winner && prediction.winner !== 'draw' && (
        <div style={{
          background: 'var(--color-surface-3)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)', border: '1px solid rgba(0,150,255,0.15)',
        }}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--color-cyan)', textTransform: 'uppercase',
            textAlign: 'center', marginBottom: 'var(--space-3)',
          }}>⚡ EXACT SCORE (+10 BONUS PTS)</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
            {/* Home score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                onClick={() => updateScore('home', -1)}
                disabled={isLocked}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                  color: '#fff', cursor: isLocked ? 'default' : 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{
                fontFamily: 'var(--font-hero)', fontSize: '2rem',
                background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                minWidth: 32, textAlign: 'center', letterSpacing: '0.05em',
              }}>{prediction.homeScore ?? 0}</span>
              <button
                onClick={() => updateScore('home', 1)}
                disabled={isLocked}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                  color: '#fff', cursor: isLocked ? 'default' : 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
            <span style={{ fontFamily: 'var(--font-hero)', fontSize: '1.5rem', color: 'var(--color-text-muted)' }}>–</span>
            {/* Away score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                onClick={() => updateScore('away', -1)}
                disabled={isLocked}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                  color: '#fff', cursor: isLocked ? 'default' : 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{
                fontFamily: 'var(--font-hero)', fontSize: '2rem',
                background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                minWidth: 32, textAlign: 'center', letterSpacing: '0.05em',
              }}>{prediction.awayScore ?? 0}</span>
              <button
                onClick={() => updateScore('away', 1)}
                disabled={isLocked}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-4)', border: '1px solid var(--color-border)',
                  color: '#fff', cursor: isLocked ? 'default' : 'pointer', fontSize: '1.2rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
