'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({ value, label, color, icon }) {
  return (
    <div style={{
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-hero)', fontSize: '2.5rem', letterSpacing: '0.05em',
        color: color || '#fff', lineHeight: 1, marginBottom: 'var(--space-2)',
      }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

/* ─── Admin Login ────────────────────────────────────────── */
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/admin/login', { username, password });
      localStorage.setItem('fc_admin_token', res.data.token);
      onLogin(res.data.admin);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: 'var(--space-8)',
    }}>
      <div style={{
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)',
        width: '100%', maxWidth: 420,
        boxShadow: 'var(--glow-blue)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>⚙️</div>
          <h2 style={{
            fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.1em',
            background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>ADMIN PANEL</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Future Champions Administration</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            {loading ? <span className="spinner" /> : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── MCQ Management Tab ─────────────────────────────────── */
function McqTab() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState({ question: '', options: ['','','',''], correct_answer: '', round_trigger: 'group_stage', is_active: false });
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  const loadQuestions = () => {
    setLoading(true);
    api.get('/api/admin/mcq', { adminAuth: true })
      .then(res => setQuestions(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleOptionChange = (i, val) => {
    setForm(f => { const opts = [...f.options]; opts[i] = val; return { ...f, options: opts }; });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.post('/api/admin/mcq', form, { adminAuth: true });
      setMsg('✅ Question saved!');
      setForm({ question: '', options: ['','','',''], correct_answer: '', round_trigger: 'group_stage', is_active: false });
      loadQuestions();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Error saving'));
    } finally { setSaving(false); }
  };

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/api/admin/mcq/${id}`, { is_active: !current }, { adminAuth: true });
      loadQuestions();
    } catch {}
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.del(`/api/admin/mcq/${id}`, { adminAuth: true });
      loadQuestions();
    } catch {}
  };

  const ROUND_OPTIONS = [
    { value: 'group_stage', label: 'After Group Stage' },
    { value: 'round_of_32', label: 'After Round of 32' },
    { value: 'round_of_16', label: 'After Round of 16' },
    { value: 'quarterfinal', label: 'After Quarter-Finals' },
    { value: 'semifinal', label: 'After Semi-Finals' },
    { value: 'final', label: 'After Final' },
  ];

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-hero)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: 'var(--space-6)', background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        MINI MCQ MANAGEMENT
      </h3>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
        Create bonus MCQ questions triggered after each FIFA stage. Correct answers award +5 points to players.
      </p>

      {/* Add question form */}
      <div style={{
        background: 'var(--color-surface-2)', border: '1px solid rgba(120,0,200,0.3)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-8)',
      }}>
        <h4 style={{ marginBottom: 'var(--space-5)', color: '#fff' }}>Add New Question</h4>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Question</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              placeholder="e.g. What year was Future Champions founded?"
              required
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Answer Options (4 options)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {form.options.map((opt, i) => (
                <input
                  key={i}
                  className="form-input"
                  value={opt}
                  onChange={e => handleOptionChange(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  required
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Correct Answer</label>
            <select
              className="form-input"
              value={form.correct_answer}
              onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}
              required
              style={{ background: 'var(--color-surface-3)', color: '#fff' }}
            >
              <option value="">Select correct answer...</option>
              {form.options.filter(Boolean).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Trigger After Stage</label>
              <select
                className="form-input"
                value={form.round_trigger}
                onChange={e => setForm(f => ({ ...f, round_trigger: e.target.value }))}
                style={{ background: 'var(--color-surface-3)', color: '#fff' }}
              >
                {ROUND_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Active (visible to players)</span>
                </label>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 180 }}>
            {saving ? <span className="spinner" /> : 'SAVE QUESTION'}
          </button>
        </form>
      </div>

      {/* Existing questions */}
      <h4 style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        All Questions ({questions.length})
      </h4>
      {loading ? (
        <div className="loading-page" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : questions.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 'var(--space-8)' }}>No questions yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {questions.map(q => (
            <div key={q.id} style={{
              background: 'var(--color-surface-2)', border: `1px solid ${q.is_active ? 'rgba(0,255,136,0.3)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#fff', marginBottom: 'var(--space-2)' }}>{q.question}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    {q.options?.map((opt, i) => (
                      <span key={i} style={{
                        fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-full)',
                        background: opt === q.correct_answer ? 'rgba(0,255,136,0.15)' : 'var(--color-surface-3)',
                        border: `1px solid ${opt === q.correct_answer ? 'rgba(0,255,136,0.4)' : 'var(--color-border)'}`,
                        color: opt === q.correct_answer ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}>{opt}{opt === q.correct_answer ? ' ✓' : ''}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                    Trigger: {ROUND_OPTIONS.find(r => r.value === q.round_trigger)?.label || q.round_trigger}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(q.id, q.is_active)}
                    className="btn btn-sm"
                    style={{
                      background: q.is_active ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${q.is_active ? 'rgba(0,255,136,0.4)' : 'var(--color-border)'}`,
                      color: q.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                    }}
                  >
                    {q.is_active ? '● Active' : '○ Inactive'}
                  </button>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="btn btn-sm"
                    style={{ background: 'rgba(255,68,102,0.1)', border: '1px solid rgba(255,68,102,0.3)', color: 'var(--color-error)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Admin Page ────────────────────────────────────── */
export default function AdminPage() {
  const [admin, setAdmin]       = useState(null);
  const [stats, setStats]       = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fc_admin_token');
    if (token) {
      loadStats().then(() => setAdmin({ username: 'admin' })).catch(() => {
        localStorage.removeItem('fc_admin_token');
        setLoading(false);
      });
    } else { setLoading(false); }
  }, []);

  const loadStats = async () => {
    const res = await api.get('/api/admin/stats', { adminAuth: true });
    setStats(res.data);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('fc_admin_token');
    setAdmin(null); setStats(null);
  };

  if (loading) return (
    <div className="loading-page" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="spinner spinner-lg" />
    </div>
  );
  if (!admin) return <AdminLogin onLogin={(a) => { setAdmin(a); loadStats(); }} />;

  const tabs = [
    { id: 'dashboard',  label: '📊 Dashboard' },
    { id: 'users',      label: '👥 Users' },
    { id: 'leaderboard',label: '🏆 Leaderboard' },
    { id: 'matches',    label: '⚽ Matches' },
    { id: 'mcq',        label: '🧠 Mini MCQ' },
    { id: 'teams',      label: '🚩 Teams' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--color-surface-1)',
        borderRight: '1px solid var(--color-border)',
        padding: 'var(--space-6)', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            fontFamily: 'var(--font-hero)', fontSize: '1.2rem', letterSpacing: '0.08em',
            background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>FUTURE CHAMPIONS</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Admin Panel</div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                background: activeTab === tab.id ? 'rgba(0,150,255,0.15)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-electric-blue)' : 'var(--color-text-muted)',
                borderLeft: activeTab === tab.id ? '2px solid var(--color-electric-blue)' : '2px solid transparent',
              }}
            >{tab.label}</button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 'auto', padding: '10px 14px', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,68,102,0.3)', background: 'rgba(255,68,102,0.05)',
            color: 'var(--color-error)', cursor: 'pointer', fontSize: '0.85rem',
            fontFamily: 'var(--font-body)', textAlign: 'left',
          }}
        >🚪 Logout</button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 'var(--space-8)', overflow: 'auto' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 'var(--space-8)',
              background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>DASHBOARD</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
              <StatCard value={stats?.total_users}       label="Total Players"      color="var(--color-electric-blue)" icon="👥" />
              <StatCard value={stats?.total_predictions} label="Predictions Made"   color="var(--color-cyan)"          icon="🎯" />
              <StatCard value={stats?.total_matches}     label="Total Matches"      color="var(--color-vibrant-orange)" icon="⚽" />
              <StatCard value={stats?.active_mcq_count}  label="Active MCQ Questions" color="var(--color-golden-yellow)" icon="🧠" />
            </div>
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
              <h4 style={{ marginBottom: 'var(--space-4)', fontFamily: 'var(--font-body)' }}>Prize Structure Reminder</h4>
              {[
                { label: 'Full Tournament (Grand)', prize: '$1,000 Cash', color: 'var(--color-golden-yellow)' },
                { label: 'Round 1 — Group Stage', prize: 'Voucher', color: 'var(--color-electric-blue)' },
                { label: 'Round 2 — R32 & R16', prize: 'Voucher', color: 'var(--color-deep-purple)' },
                { label: 'Round 3 — QF, SF & Final', prize: 'Voucher', color: 'var(--color-vibrant-orange)' },
              ].map((p, i, arr) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: 'var(--space-3) 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-hero)', fontSize: '1.1rem', color: p.color, letterSpacing: '0.05em' }}>{p.prize}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'mcq' && <McqTab />}

        {activeTab === 'users' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 'var(--space-6)', background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PLAYERS</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>User management — connect to your backend /api/admin/users endpoint.</p>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 'var(--space-6)', background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LEADERBOARD CONTROL</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>View and manage round-based leaderboards. Connect to /api/admin/leaderboard.</p>
          </div>
        )}

        {activeTab === 'matches' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 'var(--space-6)', background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MATCH CONTROL</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Update match results, lock predictions, trigger scoring. Connect to /api/admin/matches.</p>
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 'var(--space-6)', background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TEAMS</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Manage team data. Connect to /api/admin/teams.</p>
          </div>
        )}
      </main>
    </div>
  );
}
