'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';

export default function MCQPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [mcq, setMcq] = useState(null);     // active question, or null
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null); // { correct, points_earned }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/api/mcq/active')
      .then(res => {
        if (res.active) setMcq(res);
        else setMcq(null);
      })
      .catch(() => setMcq(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleSubmit = async () => {
    if (!selected || !mcq) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/api/mcq/answer', {
        question_id: mcq.id,
        answer: selected,
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" style={{ color: 'var(--color-electric-blue)' }} />
      </div>
    );
  }

  // ── COMING SOON / NO ACTIVE QUESTION ──────────────────────
  if (!mcq) {
    return (
      <div className="container" style={{ padding: 'var(--space-20) var(--space-6)', maxWidth: 640, textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>🧠</div>
        <h1 style={{
          fontFamily: 'var(--font-hero)', fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          letterSpacing: '0.08em',
          background: 'var(--gradient-blue-cyan)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 'var(--space-4)',
        }}>
          COMING SOON
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, marginBottom: 'var(--space-8)' }}>
          Bonus MCQ rounds will unlock after each stage of the tournament.
          Answer correctly for <strong style={{ color: 'var(--color-golden-yellow)' }}>+5 bonus points</strong> each round!
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
          background: 'var(--color-surface-2)', border: '1px solid rgba(0,150,255,0.3)',
          borderRadius: 'var(--radius-xl)', padding: 'var(--space-4) var(--space-6)',
        }}>
          <span style={{ fontSize: '1.5rem' }}>⏳</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Check back after the next round of matches
          </span>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN ──────────────────────────────────────────
  if (result) {
    return (
      <div className="container" style={{ padding: 'var(--space-20) var(--space-6)', maxWidth: 560, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
          {result.correct ? '🎉' : '😬'}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-hero)', fontSize: '2.5rem', letterSpacing: '0.08em',
          color: result.correct ? 'var(--color-success)' : '#FF4466',
          marginBottom: 'var(--space-3)',
        }}>
          {result.correct ? 'CORRECT!' : 'NOT QUITE'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-6)' }}>
          {result.correct
            ? `You earned +${result.points_earned} bonus points!`
            : 'No points this time — next bonus round is coming soon.'}
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/matches')}>
          BACK TO PREDICTIONS
        </button>
      </div>
    );
  }

  // ── ACTIVE QUESTION ────────────────────────────────────────
  return (
    <div className="container" style={{ padding: 'var(--space-16) var(--space-6)', maxWidth: 640 }}>
      <div className="section-header">
        <h2>BONUS MCQ</h2>
        <p>Answer correctly for +5 bonus points</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{
        background: 'var(--color-surface-2)', border: '1px solid rgba(0,150,255,0.3)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)',
      }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: 'var(--space-6)', color: '#fff' }}>
          {mcq.question}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {mcq.options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              style={{
                textAlign: 'left',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: selected === opt ? '2px solid var(--color-electric-blue)' : '1px solid var(--color-border)',
                background: selected === opt ? 'rgba(0,150,255,0.12)' : 'var(--color-surface-1)',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!selected || submitting}
          style={{ width: '100%', marginTop: 'var(--space-6)', opacity: (!selected || submitting) ? 0.5 : 1 }}
        >
          {submitting ? 'Submitting…' : 'SUBMIT ANSWER'}
        </button>
      </div>
    </div>
  );
}
