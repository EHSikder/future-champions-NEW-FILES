'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getShortName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const ROUND_TABS = [
  { id: 'overall', label: 'Overall', icon: '🏆' },
  { id: 'group_stage', label: 'Round 1', desc: 'Group Stage', icon: '⚽' },
  { id: 'round_of_32_16', label: 'Round 2', desc: 'R32 & R16', icon: '🎯' },
  { id: 'quarterfinal_semifinal', label: 'Round 3', desc: 'QF & SF', icon: '🔥' },
];

const ROUND_PRIZE = {
  overall: 'Cash Prize',
  group_stage: 'Voucher Prize',
  round_of_32_16: 'Voucher Prize',
  quarterfinal_semifinal: 'Voucher Prize',
};

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overall');
  const { t } = useLanguage();
  const { user } = useAuth();

  const fetchLeaderboard = () => {
    // Fetch overall or round-specific leaderboard
    const endpoint = activeTab === 'overall'
      ? '/api/leaderboard?limit=200'
      : `/api/leaderboard?round=${activeTab}&limit=200`;

    api.get(endpoint).then(res => {
      // Backend returns a flat array directly (not wrapped in { data: [] })
      const data = Array.isArray(res) ? res : (res.data || res || []);
      setLeaders(data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();

    // Realtime: refresh when match scores or user points change
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('leaderboard-realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => {
          fetchLeaderboard();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
          fetchLeaderboard();
        })
        .subscribe();
    }

    // Polling fallback every 30s
    const pollInterval = setInterval(fetchLeaderboard, 30000);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [activeTab]);

  const filtered = leaders.filter(u => {
    const name = u.display_name || u.full_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => a.rank - b.rank);
  const topThree = sorted.filter(u => u.rank <= 3);
  const restList = sorted.filter(u => u.rank > 3);
  const currentUser = user ? leaders.find(u => u.id === user.id) : null;

  const rank1 = topThree.find(u => u.rank === 1);
  const rank2 = topThree.find(u => u.rank === 2);
  const rank3 = topThree.find(u => u.rank === 3);

  const currentTabInfo = ROUND_TABS.find(t => t.id === activeTab);

  const renderPodiumCard = (userData, rank, isCenter) => {
    if (!userData) return <div style={{ flex: 1 }} />;
    const colors = {
      1: { bg: 'linear-gradient(180deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)', border: 'rgba(255,215,0,0.5)', text: '#FFD700' },
      2: { bg: 'linear-gradient(180deg, rgba(0,229,255,0.1) 0%, rgba(0,150,255,0.05) 100%)', border: 'rgba(0,150,255,0.4)', text: '#0096FF' },
      3: { bg: 'linear-gradient(180deg, rgba(255,100,0,0.1) 0%, rgba(255,100,0,0.05) 100%)', border: 'rgba(255,100,0,0.4)', text: '#FF6400' },
    };
    const c = colors[rank];
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', marginTop: isCenter ? 0 : 28, position: 'relative'
      }}>
        {rank === 1 && (
          <div style={{ marginBottom: 8, fontSize: '1.5rem', animation: 'float 3s ease-in-out infinite' }}>👑</div>
        )}
        <div style={{
          width: isCenter ? 60 : 48, height: isCenter ? 60 : 48, borderRadius: '50%',
          background: 'var(--color-surface-3)',
          border: `2px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: isCenter ? '1rem' : '0.85rem', color: '#fff',
          boxShadow: `0 0 20px ${c.border}`, marginBottom: 8
        }}>
          {getInitials(userData.display_name || userData.full_name)}
        </div>
        <div style={{ fontWeight: 700, fontSize: isCenter ? '0.95rem' : '0.85rem', color: '#fff', textAlign: 'center', marginBottom: 2 }}>
          {getShortName(userData.display_name || userData.full_name)}
        </div>
        <div style={{ fontFamily: 'var(--font-hero)', fontSize: isCenter ? '1.5rem' : '1.2rem', color: c.text, letterSpacing: '0.05em', marginBottom: 8 }}>
          {userData.total_points} pts
        </div>
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderBottom: 'none',
          borderRadius: '12px 12px 0 0', width: '100%',
          minHeight: isCenter ? 100 : 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-hero)', fontSize: isCenter ? '3.5rem' : '2.8rem',
            color: c.text, opacity: 0.5, lineHeight: 1
          }}>{rank}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: currentUser ? 100 : 40 }}>
        <div className="container" style={{ maxWidth: 640, padding: 'var(--space-6) var(--space-4)' }}>

          {/* Promo Video Banner */}
          <div className="lb-banner-video" style={{ position: 'relative', height: 160, marginBottom: 'var(--space-5)' }}>
            <video
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              autoPlay muted loop playsInline
              src="/videos/promo-teaser.mp4"
              poster="/images/promo-poster.jpg"
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, transparent 60%)',
              display: 'flex', alignItems: 'center', padding: 'var(--space-6)',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-hero)', fontSize: '1.6rem', letterSpacing: '0.08em',
                  background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>LEADERBOARD</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                  {currentTabInfo?.icon} {currentTabInfo?.label} — {ROUND_PRIZE[activeTab]}
                </div>
              </div>
            </div>
          </div>

          {/* Round Tabs */}
          <div className="round-tab-bar" style={{ marginBottom: 'var(--space-5)' }}>
            {ROUND_TABS.map(tab => (
              <button
                key={tab.id}
                className={`round-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Prize info bar */}
          <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px', marginBottom: 'var(--space-5)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--gradient-gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem'
            }}>🏆</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                {currentTabInfo?.label} Prize:{' '}
                <span style={{
                  fontFamily: 'var(--font-hero)', fontSize: '1.1rem',
                  background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {ROUND_PRIZE[activeTab]}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                {activeTab === 'overall'
                  ? 'Top predictor across the full tournament wins a Cash Prize'
                  : `Top predictor of ${currentTabInfo?.desc} earns a voucher`}
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <input
              className="form-input"
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 'var(--radius-lg)' }}
            />
          </div>

          {loading ? (
            <div className="loading-page">
              <div className="spinner spinner-lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
              <p>No players found</p>
            </div>
          ) : (
            <>
              {/* Podium */}
              {!search && topThree.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 8,
                  marginBottom: 'var(--space-6)', padding: '0 8px',
                  direction: 'ltr',
                }}>
                  {renderPodiumCard(rank2, 2, false)}
                  {renderPodiumCard(rank1, 1, true)}
                  {renderPodiumCard(rank3, 3, false)}
                </div>
              )}

              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(search ? sorted : restList).map((entry) => {
                  const isMe = user && entry.id === user.id;
                  return (
                    <div key={entry.id} className={`lb-row${isMe ? ' is-me' : ''}`}>
                      <div className="lb-rank" style={{ color: isMe ? 'var(--color-cyan)' : 'var(--color-text-muted)' }}>
                        {entry.rank}
                      </div>
                      <div className="lb-avatar">
                        {getInitials(entry.display_name || entry.full_name)}
                      </div>
                      <div className="lb-name">
                        {entry.display_name || entry.full_name}
                        {isMe && <span style={{ color: 'var(--color-cyan)', fontSize: '0.8rem', marginLeft: 6 }}>(You)</span>}
                      </div>
                      <div className="lb-points">
                        {entry.total_points}
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginLeft: 4, fontFamily: 'var(--font-body)', WebkitTextFillColor: 'initial' }}>pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky current user bar */}
      {currentUser && !search && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'linear-gradient(135deg, #0096FF 0%, #7800C8 100%)',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 -4px 20px rgba(0,150,255,0.4)',
          maxWidth: 640, margin: '0 auto',
          borderRadius: '20px 20px 0 0',
        }}>
          <div style={{ fontFamily: 'var(--font-hero)', fontSize: '1.5rem', color: 'white', minWidth: 36, letterSpacing: '0.05em' }}>
            {currentUser.rank}
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.8rem', color: 'white'
          }}>
            {getInitials(currentUser.display_name || currentUser.full_name)}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>
              {getShortName(currentUser.display_name || currentUser.full_name)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}> (You)</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-hero)', fontSize: '1.4rem', color: 'white', letterSpacing: '0.05em' }}>
              {currentUser.total_points}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>pts</span>
          </div>
        </div>
      )}
    </>
  );
}
