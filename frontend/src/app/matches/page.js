'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MatchCard from '@/components/predictions/MatchCard';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function MatchesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [matches, setMatches]               = useState([]);
  const [predictions, setPredictions]       = useState({});
  const [savedPredictions, setSavedPredictions] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState('');
  const [userStanding, setUserStanding]     = useState(null);
  const [topPlayer, setTopPlayer]           = useState(null);
  const [activeMcq, setActiveMcq]           = useState(null);
  const [mcqAnswer, setMcqAnswer]           = useState(null);
  const [mcqSubmitted, setMcqSubmitted]     = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  // Fetch data + set up realtime
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let channel = null;
    let debounceTimer = null;
    let pollInterval = null;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [resMatches, resPreds] = await Promise.all([
          api.get('/api/matches'),
          api.get('/api/predictions'),
        ]);

        const allMatches = resMatches.data;
        allMatches.sort((a, b) => {
          if (!a.kickoff_time) return 1;
          if (!b.kickoff_time) return -1;
          return new Date(a.kickoff_time) - new Date(b.kickoff_time);
        });
        setMatches(allMatches);

        const matchMap = {};
        allMatches.forEach(m => { matchMap[m.match_number] = m; });

        const predsData = resPreds.data.predictions || [];
        const predsObj  = {};

        predsData.forEach(p => {
          const match = matchMap[p.match_number];
          let winner = null;
          if (p.predicted_winner_team_id === null) {
            winner = 'draw';
          } else if (match?.home_team?.id && p.predicted_winner_team_id === match.home_team.id) {
            winner = 'home';
          } else if (match?.away_team?.id && p.predicted_winner_team_id === match.away_team.id) {
            winner = 'away';
          }

          predsObj[p.match_number] = {
            winner,
            homeScore:             p.predicted_home_score ?? 0,
            awayScore:             p.predicted_away_score ?? 0,
            predictedWinnerTeamId: p.predicted_winner_team_id,
            isLocked:              p.is_locked,
            lockedReason:          p.locked_reason,
            pointsEarned:          p.points_earned,
          };
        });

        setPredictions(predsObj);
        setSavedPredictions(predsObj);

        // Fetch leaderboard standing
        api.get('/api/leaderboard?limit=200').then(resLb => {
          const lbData = Array.isArray(resLb) ? resLb : (resLb.data || []);
          if (lbData.length > 0) setTopPlayer(lbData[0]);
          const me = lbData.find(u => u.id === user.id);
          if (me) setUserStanding(me);
        }).catch(() => {});

        // Check for active MCQ
        api.get('/api/mcq/active').then(resMcq => {
          if (resMcq.data?.active) setActiveMcq(resMcq.data);
        }).catch(() => {});

      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    // Debounced fetch — waits 5s after last realtime event before fetching
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchData, 5000);
    };

    fetchData();

    // Realtime: only listen for match changes (scores, status)
    if (supabase) {
      channel = supabase
        .channel('matches-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
          debouncedFetch();
        })
        .subscribe();
    }

    // Gentle polling fallback every 2 minutes
    pollInterval = setInterval(fetchData, 120000);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated, user?.id]);

  const handlePredictionChange = (matchNumber, field, value) => {
    setPredictions(prev => {
      const updated = { ...prev, [matchNumber]: { ...(prev[matchNumber] || {}), [field]: value } };
      setHasUnsavedChanges(JSON.stringify(updated) !== JSON.stringify(savedPredictions));
      return updated;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = Object.entries(predictions)
        .filter(([mn, pred]) => !pred.isLocked && pred.winner !== undefined)
        .map(([mn, pred]) => {
          const match = matches.find(m => m.match_number === parseInt(mn));
          let winnerTeamId = null;
          if (pred.winner === 'home')  winnerTeamId = match?.home_team?.id;
          if (pred.winner === 'away')  winnerTeamId = match?.away_team?.id;
          if (pred.winner === 'draw')  winnerTeamId = null;
          return {
            match_number:           parseInt(mn),
            predicted_winner_team_id: winnerTeamId,
            predicted_home_score:   pred.homeScore ?? 0,
            predicted_away_score:   pred.awayScore ?? 0,
          };
        });

      await api.post('/api/predictions', { predictions: payload });
      setSavedPredictions({ ...predictions });
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save predictions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMcqSubmit = async () => {
    if (!mcqAnswer || !activeMcq) return;
    try {
      await api.post('/api/mcq/answer', { question_id: activeMcq.id, answer: mcqAnswer });
      setMcqSubmitted(true);
    } catch {}
  };

  // Group matches by round
  const rounds = ['group_stage', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'];
  const roundLabels = {
    group_stage: 'Group Stage',
    round_of_32: 'Round of 32',
    round_of_16: 'Round of 16',
    quarterfinal: 'Quarter-Finals',
    semifinal: 'Semi-Finals',
    final: 'Final',
  };
  const matchesByRound = rounds.reduce((acc, r) => {
    acc[r] = matches.filter(m => m.round === r);
    return acc;
  }, {});

  if (authLoading || loading) {
    return (
      <div className="loading-page" style={{ background: 'var(--color-bg)', minHeight: '80vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 720, padding: 'var(--space-6) var(--space-4)', paddingBottom: '120px' }}>

        {/* Promo Video Banner */}
        <div style={{
          position: 'relative', height: 200, borderRadius: 'var(--radius-xl)',
          overflow: 'hidden', marginBottom: 'var(--space-6)',
          border: '1px solid rgba(0,150,255,0.3)',
          boxShadow: 'var(--glow-blue)',
        }}>
          <video
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55)' }}
            autoPlay muted loop playsInline
            src="/videos/promo-teaser.mp4"
            poster="/images/promo-poster.jpg"
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, transparent 70%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-6) var(--space-8)',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em',
                background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>MATCH PREDICTIONS</div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>
                Predict winners &amp; exact scores to earn points
              </p>
            </div>
            {userStanding && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Your Rank</div>
                <div style={{
                  fontFamily: 'var(--font-hero)', fontSize: '2.5rem', letterSpacing: '0.05em',
                  background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>#{userStanding.rank}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  {userStanding.total_points} pts
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active MCQ Banner */}
        {activeMcq && !mcqSubmitted && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(120,0,200,0.2) 0%, rgba(0,150,255,0.15) 100%)',
            border: '1px solid rgba(120,0,200,0.5)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: '1.5rem' }}>🧠</span>
              <div>
                <div style={{
                  fontFamily: 'var(--font-hero)', fontSize: '1.2rem', letterSpacing: '0.1em',
                  background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>BONUS MCQ — +5 POINTS</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Answer correctly to earn bonus points!</div>
              </div>
            </div>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              {activeMcq.question}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {activeMcq.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setMcqAnswer(opt)}
                  style={{
                    padding: '10px 16px', borderRadius: 'var(--radius-md)',
                    background: mcqAnswer === opt ? 'rgba(0,150,255,0.25)' : 'var(--color-surface-3)',
                    border: `1px solid ${mcqAnswer === opt ? '#0096FF' : 'var(--color-border)'}`,
                    color: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={handleMcqSubmit}
              disabled={!mcqAnswer}
              className="btn btn-gold"
              style={{ width: '100%' }}
            >
              SUBMIT ANSWER
            </button>
          </div>
        )}

        {mcqSubmitted && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--space-5)' }}>
            ✅ MCQ submitted! Bonus points will be awarded if your answer is correct.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Unsaved changes bar */}
        {hasUnsavedChanges && (
          <div style={{
            background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.4)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
          }}>
            <span style={{ color: 'var(--color-vibrant-orange)', fontWeight: 600, fontSize: '0.9rem' }}>
              ⚠️ You have unsaved predictions
            </span>
            <button
              className="btn btn-orange btn-sm"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'SAVING...' : 'SAVE ALL'}
            </button>
          </div>
        )}

        {/* Matches grouped by round */}
        {rounds.map(round => {
          const roundMatches = matchesByRound[round];
          if (!roundMatches?.length) return null;
          return (
            <div key={round} style={{ marginBottom: 'var(--space-8)' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-hero)', fontSize: '1.5rem', letterSpacing: '0.1em',
                  background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {roundLabels[round] || round}
                </h3>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>
              {roundMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictions[match.match_number]}
                  onPredictionChange={handlePredictionChange}
                />
              ))}
            </div>
          );
        })}

        {/* Floating Save button */}
        <div style={{ 
          position: 'fixed', 
          bottom: 'max(24px, env(safe-area-inset-bottom))', 
          left: 0, 
          right: 0, 
          textAlign: 'center', 
          zIndex: 999,
          pointerEvents: 'none'
        }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSubmit}
            disabled={submitting || !hasUnsavedChanges}
            style={{ 
              minWidth: 260,
              pointerEvents: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 150, 255, 0.4)',
              transform: hasUnsavedChanges ? 'translateY(0)' : 'translateY(100px)',
              opacity: hasUnsavedChanges ? 1 : 0,
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            {submitting ? 'SAVING...' : 'SAVE PREDICTIONS'}
          </button>
        </div>
      </div>
    </div>
  );
}
