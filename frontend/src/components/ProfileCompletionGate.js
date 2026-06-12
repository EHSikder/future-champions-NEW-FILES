'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// Pages where this gate should NOT appear
// (auth flow pages + admin panel)
const EXCLUDED_PATHS = ['/login', '/signup', '/verify', '/complete-profile', '/admin-panel'];

export default function ProfileCompletionGate() {
  const pathname = usePathname();
  const { user, loading, isAuthenticated, login } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Still loading auth state — don't flash the modal
  if (loading) return null;

  // Not logged in — nothing to gate
  if (!isAuthenticated || !user) return null;

  // Don't show on auth/onboarding/admin pages
  if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return null;

  // Profile already has a display name — all good
  if (user.display_name && user.display_name.trim() !== '') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = displayName.trim();

    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }
    if (trimmed.length > 30) {
      setError('Display name must be 30 characters or less.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Updates the existing user row — never inserts a new one
      const res = await api.put('/api/auth/profile', { display_name: trimmed });
      const updatedUser = res.data?.user;
      const token = res.data?.token;

      if (token && updatedUser) {
        // Refresh the session with the new display_name so this gate closes
        login(token, { ...user, ...updatedUser });
      }
    } catch (err) {
      setError(err.data?.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid rgba(0,150,255,0.35)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--glow-blue)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>👤</div>

        <h2
          style={{
            fontFamily: 'var(--font-hero)',
            fontSize: '1.6rem',
            letterSpacing: '0.08em',
            background: 'var(--gradient-blue-cyan)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 'var(--space-3)',
          }}
        >
          ONE LAST STEP
        </h2>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
          Choose a display name — this is what other players will see on the leaderboard.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            className="form-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your leaderboard name"
            maxLength={30}
            autoFocus
            style={{ marginBottom: 'var(--space-3)', textAlign: 'center' }}
          />

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Saving…' : 'CONTINUE'}
          </button>
        </form>
      </div>
    </div>
  );
}
