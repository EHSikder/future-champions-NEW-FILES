'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';

/* ─── One question card ──────────────────────────────────────
   Unanswered → interactive (pick an option + submit).
   Answered   → locked: greyed out, correct option in green, a wrong pick
                in red, plus a result badge. Cannot be edited. */
function QuizCard({ q, index, selected, onSelect, onSubmit, submitting, error }) {
  const answered = q.answered;

  const optionStyle = (opt) => {
    // Locked / answered styling
    if (answered) {
      const isCorrectOpt = opt === q.correct_answer;
      const isYourWrong  = opt === q.your_answer && !q.is_correct;
      if (isCorrectOpt) return {
        border: '2px solid var(--color-success)',
        background: 'rgba(0,255,136,0.12)', color: 'var(--color-success)',
      };
      if (isYourWrong) return {
        border: '2px solid #FF4466',
        background: 'rgba(255,68,102,0.12)', color: '#FF8099',
      };
      return {
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface-1)', color: 'var(--color-text-dim)',
      };
    }
    // Interactive styling
    return {
      border: selected === opt ? '2px solid var(--color-electric-blue)' : '1px solid var(--color-border)',
      background: selected === opt ? 'rgba(0,150,255,0.12)' : 'var(--color-surface-1)',
      color: '#fff',
    };
  };

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: `1px solid ${answered ? (q.is_correct ? 'rgba(0,255,136,0.35)' : 'rgba(255,68,102,0.3)') : 'rgba(0,150,255,0.3)'}`,
      borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
      opacity: answered ? 0.92 : 1, transition: 'all 0.3s',
    }}>
      {/* Header row: number + result badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <span style={{
          fontFamily: 'var(--font-hero)', fontSize: '0.8rem', letterSpacing: '0.1em',
          color: 'var(--color-text-dim)', textTransform: 'uppercase',
        }}>Question {index + 1}</span>
        {answered && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em',
            padding: '4px 12px', borderRadius: 'var(--radius-full)',
            background: q.is_correct ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)',
            color: q.is_correct ? 'var(--color-success)' : '#FF8099',
            border: `1px solid ${q.is_correct ? 'rgba(0,255,136,0.4)' : 'rgba(255,68,102,0.4)'}`,
          }}>
            {q.is_correct ? `✓ CORRECT  +${q.points_earned}` : '✕ INCORRECT  +0'}
          </span>
        )}
      </div>

      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 'var(--space-5)', color: '#fff', lineHeight: 1.4 }}>
        {q.question}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {q.options?.map((opt) => (
          <button
            key={opt}
            onClick={() => !answered && onSelect(q.id, opt)}
            disabled={answered || submitting}
            style={{
              textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              fontSize: '1rem', cursor: answered ? 'default' : 'pointer',
              transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              ...optionStyle(opt),
            }}
          >
            <span>{opt}</span>
            {answered && opt === q.correct_answer && <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>✓</span>}
            {answered && opt === q.your_answer && !q.is_correct && <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>your pick</span>}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>{error}</div>}

      {!answered && (
        <button
          className="btn btn-primary"
          onClick={() => onSubmit(q)}
          disabled={!selected || submitting}
          style={{ width: '100%', marginTop: 'var(--space-5)', opacity: (!selected || submitting) ? 0.5 : 1 }}
        >
          {submitting ? 'Submitting…' : 'SUBMIT ANSWER'}
        </button>
      )}
    </div>
  );
}

export default function QuizPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState({});   // { [qId]: option }
  const [submitting, setSubmitting] = useState({}); // { [qId]: bool }
  const [errors, setErrors]       = useState({});   // { [qId]: message }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/api/mcq/all')
      .then(res => setQuestions(res.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleSelect = (qId, opt) => setSelected(s => ({ ...s, [qId]: opt }));

  const handleSubmit = async (q) => {
    const choice = selected[q.id];
    if (!choice) return;
    setSubmitting(s => ({ ...s, [q.id]: true }));
    setErrors(e => ({ ...e, [q.id]: '' }));
    try {
      const res = await api.post('/api/mcq/answer', { question_id: q.id, answer: choice });
      // Lock this question in place with its result — it drops into the
      // "answered" section and can no longer be edited.
      setQuestions(prev => prev.map(item => item.id === q.id ? {
        ...item,
        answered:       true,
        your_answer:    choice,
        is_correct:     res.correct,
        points_earned:  res.points_earned,
        correct_answer: res.correct_answer,
      } : item));
    } catch (err) {
      setErrors(e => ({ ...e, [q.id]: err.message || 'Failed to submit answer.' }));
    } finally {
      setSubmitting(s => ({ ...s, [q.id]: false }));
    }
  };

  // Unanswered first (active), answered pushed to the bottom (locked).
  const { unanswered, answered, totalPoints } = useMemo(() => {
    const un = questions.filter(q => !q.answered);
    const an = questions.filter(q => q.answered);
    const pts = questions.reduce((sum, q) => sum + (q.points_earned || 0), 0);
    return { unanswered: un, answered: an, totalPoints: pts };
  }, [questions]);

  if (authLoading || loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" style={{ color: 'var(--color-electric-blue)' }} />
      </div>
    );
  }

  // ── COMING SOON / no active questions ─────────────────────
  if (questions.length === 0) {
    return (
      <div className="container" style={{ padding: 'var(--space-20) var(--space-6)', maxWidth: 640, textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>🧠</div>
        <h1 style={{
          fontFamily: 'var(--font-hero)', fontSize: 'clamp(2.5rem, 8vw, 4rem)', letterSpacing: '0.08em',
          background: 'var(--gradient-blue-cyan)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 'var(--space-4)',
        }}>COMING SOON</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-lg)', lineHeight: 1.7, marginBottom: 'var(--space-8)' }}>
          Bonus QUIZ rounds unlock after each stage of the tournament.
          Answer correctly for <strong style={{ color: 'var(--color-golden-yellow)' }}>+5 bonus points</strong> each!
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
          background: 'var(--color-surface-2)', border: '1px solid rgba(0,150,255,0.3)',
          borderRadius: 'var(--radius-xl)', padding: 'var(--space-4) var(--space-6)',
        }}>
          <span style={{ fontSize: '1.5rem' }}>⏳</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Check back after the next round of matches</span>
        </div>
      </div>
    );
  }

  const allDone = unanswered.length === 0;

  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-6) var(--space-20)', maxWidth: 680 }}>
      <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h2>BONUS QUIZ</h2>
        <p>Answer each question correctly for +5 bonus points</p>
      </div>

      {/* Progress / score summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--color-surface-2)', border: '1px solid rgba(255,200,0,0.3)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-4) var(--space-6)',
        marginBottom: 'var(--space-8)',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Answered</div>
          <div style={{ fontFamily: 'var(--font-hero)', fontSize: '1.6rem', color: '#fff' }}>
            {answered.length}<span style={{ color: 'var(--color-text-dim)', fontSize: '1rem' }}> / {questions.length}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bonus Points</div>
          <div style={{
            fontFamily: 'var(--font-hero)', fontSize: '1.6rem',
            background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>+{totalPoints}</div>
        </div>
      </div>

      {allDone && (
        <div style={{
          textAlign: 'center', background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.3)', borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)', marginBottom: 'var(--space-8)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🎉</div>
          <p style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1.1rem' }}>
            All questions answered! You earned +{totalPoints} bonus points.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 'var(--space-2)' }}>
            New questions unlock after each tournament stage — check back soon.
          </p>
        </div>
      )}

      {/* Active questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {unanswered.map((q, i) => (
          <QuizCard
            key={q.id}
            q={q}
            index={i}
            selected={selected[q.id]}
            onSelect={handleSelect}
            onSubmit={handleSubmit}
            submitting={!!submitting[q.id]}
            error={errors[q.id]}
          />
        ))}
      </div>

      {/* Answered (locked) questions */}
      {answered.length > 0 && (
        <>
          <h4 style={{
            margin: `var(--space-10) 0 var(--space-4)`, color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>Completed ({answered.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {answered.map((q, i) => (
              <QuizCard
                key={q.id}
                q={q}
                index={unanswered.length + i}
                selected={null}
                onSelect={() => {}}
                onSubmit={() => {}}
                submitting={false}
                error={null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
