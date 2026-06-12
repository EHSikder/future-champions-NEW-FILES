'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SCORING_TABLE, GROUPS } from '@/lib/constants';
import api from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
    </svg>
  );
}

const PRIZES = [
  {
    id: 'grand',
    label: 'Full Tournament',
    amount: 'Cash Prize',
    desc: 'Top predictor across all rounds',
    isGrand: true,
    icon: '🏆',
  },
  {
    id: 'r1',
    label: 'Round 1',
    amount: 'Voucher',
    desc: 'Group Stage winner',
    icon: '⚽',
  },
  {
    id: 'r2',
    label: 'Round 2',
    amount: 'Voucher',
    desc: 'R32 & R16 best predictor',
    icon: '🎯',
  },
  {
    id: 'r3',
    label: 'Round 3',
    amount: 'Voucher',
    desc: 'Quarter & Semi-Finals winner',
    icon: '🔥',
  },
];

export default function HomePage() {
  const [teams, setTeams] = useState([]);
  const { t, locale } = useLanguage();

  useEffect(() => {
    api.get('/api/teams').then(res => {
      if (res.data) setTeams(res.data);
    }).catch(() => {});
  }, []);

  const groupedTeams = GROUPS.map(g => ({
    letter: g,
    teams: teams.filter(tm => tm.group_letter === g),
  }));

  return (
    <>

     {/* ── HERO: Image banner (desktop + mobile) ───────────── */}
      <section className="hero-image-section" style={{
        position: 'relative',
        width: '100%',
        height: '592px',
        overflow: 'hidden',
        background: '#000',
      }}>
        {/* Desktop image — 1783x592 */}
        <img
          src="/images/hero-desktop.jpg"
          alt=""
          className="hero-image-desktop"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />

        {/* Mobile image — 578x592 */}
        <img
          src="/images/hero-mobile.jpg"
          alt=""
          className="hero-image-mobile"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />

        {/* Action Buttons only — no overlay, no text */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 'clamp(24px, 6vw, 56px)',
        }}>
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <Link href="/login" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #0096FF 0%, #7800C8 100%)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 150, 255, 0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 150, 255, 0.8)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 150, 255, 0.5)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              PREDICT NOW
              <ArrowIcon />
            </Link>

            <Link href="/leaderboard" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            >
              <TrophyIcon />
              VIEW LEADERBOARD
            </Link>
          </div>
        </div>
      </section>        


      {/* ── PROMO VIDEO TEASER (shown on subsequent visit) ──── */}
      {/* This section is commented out on homepage since full hero is above */}

      {/* ── HOW TO JOIN & WIN ───────────────────────────────── */}
      <section className="section" style={{ background: 'var(--color-surface-1)' }}>
        <div className="container">
          <div className="section-header">
            <h2>HOW TO JOIN &amp; WIN</h2>
            <p>Three simple steps to become the Future Champion</p>
          </div>
          <div className="steps-grid">
            <div className="card-scifi step-card" style={{
              background: 'var(--color-surface-2)', padding: 'var(--space-8)',
              borderRadius: 'var(--radius-xl)', textAlign: 'center',
              border: '1px solid rgba(0,150,255,0.3)', transition: 'all 0.3s',
            }}>
              <div className="step-number">1</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.75rem', color: '#fff' }}>
                SIGN UP INSTANTLY
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                Create your account with Google in seconds and complete your champion profile.
              </p>
            </div>
            <div className="card-scifi step-card" style={{
              background: 'var(--color-surface-2)', padding: 'var(--space-8)',
              borderRadius: 'var(--radius-xl)', textAlign: 'center',
              border: '1px solid rgba(120,0,200,0.3)', transition: 'all 0.3s',
            }}>
              <div className="step-number" style={{ background: 'var(--gradient-purple-violet)', boxShadow: 'var(--glow-purple)' }}>2</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.75rem', color: '#fff' }}>
                PREDICT EVERY MATCH
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                Predict match winners &amp; exact scores before kickoff. Earn bonus points for perfect predictions.
              </p>
            </div>
            <div className="card-scifi step-card" style={{
              background: 'var(--color-surface-2)', padding: 'var(--space-8)',
              borderRadius: 'var(--radius-xl)', textAlign: 'center',
              border: '1px solid rgba(255,100,0,0.4)', transition: 'all 0.3s',
            }}>
              <div className="step-number" style={{ background: 'var(--gradient-orange-fire)', boxShadow: 'var(--glow-orange)' }}>3</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.75rem', color: '#fff' }}>
                CLAIM YOUR PRIZE
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                Top the leaderboard in any round or the full tournament to win cash &amp; vouchers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRIZES ─────────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--color-bg)' }}>
        <div className="container">
          <div className="section-header">
            <h2>PRIZES</h2>
            <p>5 winners across all tournament rounds — every round counts</p>
          </div>

          {/* Grand Prize Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,100,0,0.12) 50%, rgba(255,0,204,0.08) 100%)',
            border: '1px solid rgba(255,215,0,0.4)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-10)',
            textAlign: 'center',
            marginBottom: 'var(--space-6)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.15) 0%, transparent 60%)',
              pointerEvents: 'none'
            }} />
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🏆</div>
            <div style={{
              fontFamily: 'var(--font-hero)', fontSize: 'clamp(3rem, 8vw, 5rem)',
              background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              letterSpacing: '0.05em', lineHeight: 1, marginBottom: 'var(--space-2)',
            }}>CASH PRIZE</div>
            <div style={{
              fontFamily: 'var(--font-hero)', fontSize: '1.5rem', letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.7)', marginBottom: 'var(--space-3)',
            }}>GRAND PRIZE — FULL TOURNAMENT</div>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: 500, margin: '0 auto' }}>
              The top predictor across the entire tournament takes home the grand cash prize.
            </p>
          </div>

          {/* Round Vouchers */}
          <div className="prizes-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)'
          }}>
            {[
              { label: 'Round 1', desc: 'Group Stage', icon: '⚽', color: '#0096FF' },
              { label: 'Round 2', desc: 'R32 & Round of 16', icon: '🎯', color: '#7800C8' },
              { label: 'Round 3', desc: 'Quarter & Semi-Finals', icon: '🔥', color: '#FF6400' },          
              
            ].map((prize, i) => (
              <div key={i} style={{
                background: 'var(--color-surface-2)',
                border: `1px solid ${prize.color}40`,
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                transition: 'all 0.3s',
                cursor: 'default',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>{prize.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-hero)', fontSize: '0.85rem', letterSpacing: '0.15em',
                  color: prize.color, marginBottom: 'var(--space-2)', textTransform: 'uppercase'
                }}>{prize.label}</div>
                <div style={{
                  fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.05em',
                  color: '#fff', lineHeight: 1, marginBottom: 'var(--space-2)',
                }}>VOUCHER</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{prize.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORING SYSTEM ─────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--color-surface-1)' }}>
        <div className="container">
          <div className="section-header">
            <h2>SCORING SYSTEM</h2>
            <p>Earn points by predicting correctly — score big with exact scores</p>
          </div>

          {/* Exact Score Bonus Highlight */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,150,255,0.15) 0%, rgba(120,0,200,0.15) 100%)',
            border: '1px solid rgba(0,150,255,0.4)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            marginBottom: 'var(--space-8)',
            textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            maxWidth: 560, margin: '0 auto var(--space-8)',
          }}>
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: 'var(--gradient-blue-cyan)', color: '#000',
              fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em',
              padding: '4px 10px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase'
            }}>Any Round</div>
            <div style={{
              fontFamily: 'var(--font-hero)', fontSize: '1.2rem', letterSpacing: '0.15em',
              color: 'var(--color-cyan)', marginBottom: 'var(--space-2)',
            }}>⚡ EXACT SCORE BONUS</div>
            <div style={{
              fontFamily: 'var(--font-hero)', fontSize: '6rem', lineHeight: 1,
              background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>+10</div>
            <div style={{
              fontFamily: 'var(--font-hero)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--color-cyan)'
            }}>POINTS PER MATCH</div>
            <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', fontSize: '0.9rem' }}>
              Earn 10 bonus points in any round when you predict the exact final score.
            </p>
          </div>

          {/* Scoring Table */}
          <div className="scoring-grid">
            {SCORING_TABLE.map((item) => (
              <div className="scoring-card" key={item.round}>
                <div className="scoring-round">{t(item.roundKey)}</div>
                <div className="scoring-points">{item.points}</div>
                <div className="scoring-label">pts / correct winner</div>
              </div>
            ))}
          </div>

          {/* MCQ Bonus Banner */}
          <div style={{
            marginTop: 'var(--space-8)',
            background: 'linear-gradient(135deg, rgba(120,0,200,0.2) 0%, rgba(0,150,255,0.15) 100%)',
            border: '1px solid rgba(120,0,200,0.4)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
            flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '3rem' }}>🧠</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                fontFamily: 'var(--font-hero)', fontSize: '1.8rem', letterSpacing: '0.08em',
                color: '#fff', marginBottom: 'var(--space-2)',
              }}>MINI MCQ BONUS ROUNDS</div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                After each stage of FIFA games, unlock a special Mini MCQ with questions about Future Champions.
                Every correct answer earns you an extra <strong style={{ color: 'var(--color-golden-yellow)' }}>+5 bonus points</strong>!
              </p>
            </div>
            <div style={{
              background: 'var(--gradient-gold)', color: '#000',
              fontFamily: 'var(--font-hero)', fontSize: '2.5rem',
              padding: '12px 24px', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--glow-gold)', letterSpacing: '0.05em',
            }}>+5 PTS</div>
          </div>
        </div>
      </section>

      {/* ── TEAMS / GROUPS ─────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--color-bg)' }}>
        <div className="container">
          <div className="section-header">
            <h2>THE 48 TEAMS</h2>
            <p>12 groups of 4 teams competing in the biggest World Cup ever</p>
          </div>
          <div className="groups-grid">
            {groupedTeams.map(group => (
              <div className="group-card" key={group.letter}>
                <div className="group-card-header">GROUP {group.letter}</div>
                <div className="group-card-body">
                  {group.teams.length > 0 ? group.teams.map(team => (
                    <div className="group-team-row" key={team.id}>
                      <img src={team.flag_url} alt={team.name} className="team-flag" loading="lazy" />
                      <span className="team-name">{team.name}</span>
                    </div>
                  )) : (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div className="group-team-row" key={i}>
                        <div className="skeleton" style={{ width: 28, height: 20 }} />
                        <div className="skeleton" style={{ width: '60%', height: 14 }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────── */}
      <section className="section" style={{
        background: 'linear-gradient(135deg, var(--color-surface-1) 0%, var(--color-bg) 100%)',
        textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: 700 }}>
          {/* Promo video teaser on home page bottom CTA */}
          <div style={{ marginBottom: 'var(--space-10)', position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--glow-blue)' }}>
            <video
              style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', filter: 'brightness(0.65)' }}
              autoPlay muted loop playsInline
              src="/videos/promo-teaser.mp4"
              poster="/images/promo-poster.jpg"
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
              display: 'flex', alignItems: 'center', padding: 'var(--space-8)',
            }}>              
            </div>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-hero)', fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            marginBottom: 'var(--space-4)', letterSpacing: '0.05em',
          }}>READY TO WIN CASH PRIZE?</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', fontSize: 'var(--fs-lg)', lineHeight: 1.7 }}>
            Join the challenge, predict every match, unlock bonus rounds, and outsmart every competitor to claim the grand prize.
          </p>
          <Link href="/login" className="btn-predict" style={{ fontSize: '1.3rem', padding: '16px 48px' }}>
            START PREDICTING <ArrowIcon />
          </Link>
        </div>
      </section>
    </>
  );
}
