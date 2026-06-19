'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

/* ─── Shared table / heading helpers ────────────────────── */
const thStyle = { padding: '12px 14px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const tdStyle = { padding: '11px 14px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' };

const ROUND_LABELS = {
  group_stage: 'Group', round_of_32: 'R32', round_of_16: 'R16',
  quarterfinal: 'QF', semifinal: 'SF', third_place: '3rd', final: 'Final',
};

const STATUS_COLORS = {
  scheduled: 'var(--color-text-muted)',
  live: '#FF4466', halftime: '#FF4466', extra_time: '#FF4466', penalties: '#FF4466',
  finished: 'var(--color-success)',
};

function AdminH2({ children }) {
  return <h2 style={{ fontFamily: 'var(--font-hero)', fontSize: '2rem', letterSpacing: '0.08em', marginBottom: 'var(--space-6)', background: 'var(--gradient-blue-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{children}</h2>;
}

function Loading() {
  return <div className="loading-page" style={{ minHeight: 200 }}><div className="spinner" /></div>;
}

function TableWrap({ children }) {
  return <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>{children}</div>;
}

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
  const EMPTY_FORM = { question: '', options: ['','','',''], correct_answer: '', round_trigger: 'group_stage', is_active: false };
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);   // null = creating, id = editing
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

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); };

  const startEdit = (q) => {
    // Pad options to 4 boxes so the grid stays consistent.
    const opts = [...(q.options || [])];
    while (opts.length < 4) opts.push('');
    setForm({
      question: q.question || '',
      options: opts.slice(0, 4),
      correct_answer: q.correct_answer || '',
      round_trigger: q.round_trigger || 'group_stage',
      is_active: !!q.is_active,
    });
    setEditingId(q.id);
    setMsg('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      if (editingId) {
        await api.put(`/api/admin/mcq/${editingId}`, form, { adminAuth: true });
        setMsg('✅ Question updated!');
      } else {
        await api.post('/api/admin/mcq', form, { adminAuth: true });
        setMsg('✅ Question saved!');
      }
      resetForm();
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
    if (!confirm('Delete this question? This also removes any answers players gave to it.')) return;
    try {
      await api.del(`/api/admin/mcq/${id}`, { adminAuth: true });
      if (editingId === id) resetForm();
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
        MINI QUIZ MANAGEMENT
      </h3>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
        Create bonus QUIZ questions triggered after each FIFA stage. Correct answers award +5 points to players.
      </p>

      {/* Add / edit question form */}
      <div style={{
        background: 'var(--color-surface-2)', border: `1px solid ${editingId ? 'rgba(0,150,255,0.45)' : 'rgba(120,0,200,0.3)'}`,
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-8)',
      }}>
        <h4 style={{ marginBottom: 'var(--space-5)', color: '#fff' }}>{editingId ? '✏️ Edit Question' : 'Add New Question'}</h4>
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
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 180 }}>
              {saving ? <span className="spinner" /> : (editingId ? 'UPDATE QUESTION' : 'SAVE QUESTION')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn btn-sm" disabled={saving}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                Cancel
              </button>
            )}
          </div>
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
                    onClick={() => startEdit(q)}
                    className="btn btn-sm"
                    style={{ background: 'rgba(0,150,255,0.1)', border: '1px solid rgba(0,150,255,0.35)', color: 'var(--color-electric-blue)' }}
                  >
                    Edit
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

/* ─── Users Tab ──────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [error, setError]     = useState('');

  const load = (q = '') => {
    setLoading(true); setError('');
    api.get(`/api/admin/users?limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`, { adminAuth: true })
      .then(res => setUsers(res.data || []))
      .catch(err => setError(err.message || 'Failed to load players'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <AdminH2>PLAYERS ({users.length})</AdminH2>
      <form onSubmit={(e) => { e.preventDefault(); load(search); }} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', maxWidth: 460 }}>
        <input className="form-input" placeholder="Search name, email, mobile…" value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
        <button className="btn btn-primary" type="submit" style={{ flexShrink: 0 }}>Search</button>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : users.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No players found.</p>
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead><tr style={{ background: 'var(--color-surface-2)', textAlign: 'left' }}>
              {['Player', 'Email', 'Mobile', 'Points', 'Verified', 'Predicted'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>{u.full_name || '—'}</td>
                  <td style={tdStyle}>{u.email || '—'}</td>
                  <td style={tdStyle}>{u.mobile_number || '—'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-hero)', color: 'var(--color-golden-yellow)' }}>{u.total_points ?? 0}</td>
                  <td style={tdStyle}>{u.is_verified ? '✅' : '—'}</td>
                  <td style={tdStyle}>{u.has_submitted_prediction ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

/* ─── Matches Tab ────────────────────────────────────────── */
function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/api/matches?limit=200')
      .then(res => setMatches(res.data || []))
      .catch(err => setError(err.message || 'Failed to load matches'))
      .finally(() => setLoading(false));
  }, []);

  const sideLabel = (m, side) => m[`${side}_team`]?.name || m[`${side}_placeholder`] || 'TBD';
  const scoreText = (m) => (m.home_score != null && m.away_score != null) ? `${m.home_score} – ${m.away_score}` : 'vs';

  return (
    <div>
      <AdminH2>MATCHES ({matches.length})</AdminH2>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : matches.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No matches found.</p>
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead><tr style={{ background: 'var(--color-surface-2)', textAlign: 'left' }}>
              {['#', 'Round', 'Match', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.match_number} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ ...tdStyle, color: 'var(--color-text-dim)' }}>{m.match_number}</td>
                  <td style={tdStyle}>{ROUND_LABELS[m.round] || m.round}</td>
                  <td style={{ ...tdStyle, color: '#fff' }}>
                    {sideLabel(m, 'home')}{' '}
                    <span style={{ color: 'var(--color-golden-yellow)', fontFamily: 'var(--font-hero)', margin: '0 6px' }}>{scoreText(m)}</span>{' '}
                    {sideLabel(m, 'away')}
                  </td>
                  <td style={{ ...tdStyle, color: STATUS_COLORS[m.status] || 'var(--color-text-muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                    {(m.status || 'scheduled').replace('_', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

/* ─── Teams Tab ──────────────────────────────────────────── */
function TeamsTab() {
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/api/teams')
      .then(res => setTeams(res.data || []))
      .catch(err => setError(err.message || 'Failed to load teams'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <AdminH2>TEAMS ({teams.length})</AdminH2>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : teams.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No teams found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 'var(--space-3)' }}>
          {teams.map(team => (
            <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)' }}>
              {team.flag_url
                ? <img src={team.flag_url} alt="" width={30} height={21} style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                : <span style={{ fontSize: '1.4rem' }}>🏳️</span>}
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
                <div style={{ color: 'var(--color-text-dim)', fontSize: '0.72rem' }}>Group {team.group_letter} · {team.short_code}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Leaderboard Tab ────────────────────────────────────── */
function LeaderboardTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [round, setRound]     = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    api.get(`/api/leaderboard?limit=100${round ? `&round=${round}` : ''}`)
      .then(res => setRows(Array.isArray(res) ? res : (res.data || [])))
      .catch(err => setError(err.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [round]);

  const tabs = [
    { key: '',                       label: 'Overall' },
    { key: 'group_stage',            label: 'Round 1' },
    { key: 'round_of_32_16',         label: 'Round 2' },
    { key: 'quarterfinal_semifinal', label: 'Round 3' },
  ];

  return (
    <div>
      <AdminH2>LEADERBOARD</AdminH2>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setRound(tb.key)} className="btn btn-sm" style={{
            background: round === tb.key ? 'rgba(0,150,255,0.15)' : 'transparent',
            border: `1px solid ${round === tb.key ? 'var(--color-electric-blue)' : 'var(--color-border)'}`,
            color: round === tb.key ? 'var(--color-electric-blue)' : 'var(--color-text-muted)',
          }}>{tb.label}</button>
        ))}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : rows.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No ranked players yet.</p>
      ) : (
        <TableWrap>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead><tr style={{ background: 'var(--color-surface-2)', textAlign: 'left' }}>
              {['Rank', 'Player', 'Points'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-hero)', color: r.rank <= 3 ? 'var(--color-golden-yellow)' : 'var(--color-text-muted)' }}>#{r.rank}</td>
                  <td style={{ ...tdStyle, color: '#fff' }}>{r.full_name || r.display_name || 'Player'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-hero)', color: 'var(--color-golden-yellow)' }}>{r.total_points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
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
    { id: 'mcq',        label: '🧠 Mini QUIZ' },
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
              <StatCard value={stats?.active_mcq_count}  label="Active QUIZ Questions" color="var(--color-golden-yellow)" icon="🧠" />
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
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        {activeTab === 'matches' && <MatchesTab />}
        {activeTab === 'teams' && <TeamsTab />}
      </main>
    </div>
  );
}
