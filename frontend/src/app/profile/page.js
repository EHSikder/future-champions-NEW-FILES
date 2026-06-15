'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ROUND_NAMES } from '@/lib/constants';
import { NotificationBanner } from '@/components/NotificationPrompt';
import PageBanner from '@/components/PageBanner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Display name editing
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [displayNameMsg, setDisplayNameMsg] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated) {
      api.get('/api/auth/me').then(res => {
        setProfile(res.data);
        setDisplayNameInput(res.data?.display_name || '');
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSaveDisplayName = async () => {
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      setDisplayNameMsg({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }
    try {
      setSavingDisplayName(true);
      setDisplayNameMsg(null);
      const res = await api.put('/api/auth/profile', { display_name: trimmed });
      const updatedUser = res.data?.user || res.data;
      setProfile(prev => ({ ...prev, display_name: updatedUser.display_name || trimmed }));
      setEditingDisplayName(false);
      setDisplayNameMsg({ type: 'success', text: 'Display name updated!' });
      setTimeout(() => setDisplayNameMsg(null), 3000);
    } catch (err) {
      setDisplayNameMsg({ type: 'error', text: err.data?.message || 'Failed to update.' });
    } finally {
      setSavingDisplayName(false);
    }
  };

  if (authLoading || loading) {
    return <div className="loading-page"><div className="spinner spinner-lg" style={{ color: 'var(--color-golden-yellow)' }} /></div>;
  }

  if (!profile) return null;

  const { stats } = profile;

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: 800 }}>

      {/* Image Banner */}
      <PageBanner title="MY PROFILE" />

      {/* Notification Banner */}
      <NotificationBanner />

      {/* Points Banner */}
      <div className="card card-highlighted" style={{ textAlign: 'center', marginBottom: 'var(--space-6)', padding: 'var(--space-8)' }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-golden-yellow)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 'var(--space-2)' }}>Total Points</div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-6xl)', fontWeight: 800, color: 'var(--color-golden-yellow)', lineHeight: 1 }}>
          {profile.total_points || 0}
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-2)' }}>
          {stats?.correct_predictions || 0} Correct Out of {stats?.total_predictions || 0} predictions
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-card-value">{stats?.total_predictions || 0}</div>
          <div className="stat-card-label">Predictions Made</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{stats?.correct_predictions || 0}</div>
          <div className="stat-card-label">Correct Predictions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: profile.has_submitted_prediction ? 'var(--color-green)' : 'var(--color-warning)' }}>
            {profile.has_submitted_prediction ? 'Yes' : 'No'}
          </div>
          <div className="stat-card-label">Prediction Submitted</div>
        </div>
      </div>

      {/* Points Breakdown */}
      {stats?.points_breakdown && Object.keys(stats.points_breakdown).length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--fs-lg)' }}>Points Breakdown</h3>
          {Object.entries(stats.points_breakdown).map(([round, pts]) => (
            <div key={round} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)' }}>{ROUND_NAMES[round] || round}</span>
              <span className="points-display" style={{ fontSize: 'var(--fs-base)' }}>{pts} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* User Info */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--fs-lg)' }}>Account Details</h3>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {/* Regular fields */}
          {[
            ['Name', profile.full_name],
            ['Company', profile.company_name || '—'],
            ['Email', profile.email],
            ['Mobile', profile.mobile_number],
            ['Favorite Team', profile.favorite_team?.name || 'Not selected'],
            ['Joined', new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>{label}</span>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{value}</span>
            </div>
          ))}

          {/* Editable Display Name */}
          <div style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>Display Name</span>
              {!editingDisplayName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{profile.display_name || '—'}</span>
                  <button
                    onClick={() => { setEditingDisplayName(true); setDisplayNameInput(profile.display_name || ''); setDisplayNameMsg(null); }}
                    style={{
                      background: 'none', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--color-cyan)',
                      cursor: 'pointer', padding: '2px 8px', fontSize: '0.75rem',
                      transition: 'all 0.2s',
                    }}
                  >✎ Edit</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="form-input"
                    value={displayNameInput}
                    onChange={e => setDisplayNameInput(e.target.value)}
                    placeholder="Your leaderboard name"
                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 160 }}
                    maxLength={30}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveDisplayName(); if (e.key === 'Escape') setEditingDisplayName(false); }}
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={savingDisplayName}
                    style={{
                      background: 'var(--gradient-blue-cyan)', border: 'none',
                      borderRadius: 'var(--radius-sm)', color: '#000',
                      cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >{savingDisplayName ? '...' : 'Save'}</button>
                  <button
                    onClick={() => setEditingDisplayName(false)}
                    style={{
                      background: 'none', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)',
                      cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem',
                    }}
                  >✕</button>
                </div>
              )}
            </div>
            {displayNameMsg && (
              <div style={{
                fontSize: '0.75rem', marginTop: 4, textAlign: 'right',
                color: displayNameMsg.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
              }}>{displayNameMsg.text}</div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: 2, textAlign: 'right' }}>
              This is the name shown on the leaderboard
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Link href="/matches" className="btn btn-primary">Edit Predictions</Link>
        <Link href="/leaderboard" className="btn btn-secondary">Leaderboard</Link>
        <button className="btn btn-ghost" onClick={() => { logout(); router.push('/'); }} style={{ color: 'var(--color-error)' }}>Logout</button>
      </div>
    </div>
    </div>
  );
}
