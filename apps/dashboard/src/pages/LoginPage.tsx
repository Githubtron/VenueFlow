import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

type Mode = 'login' | 'register';

const s: Record<string, any> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' },
  card: { background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 12, padding: 40, width: 380 },
  logo: { fontSize: 22, fontWeight: 700, color: '#7c6af7', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#475569', marginBottom: 28 },
  tabs: { display: 'flex', gap: 0, marginBottom: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid #2d3148' },
  tab: (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: active ? '#7c6af7' : 'transparent', color: active ? '#fff' : '#64748b',
  }),
  label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 },
  input: {
    width: '100%', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 6,
    padding: '10px 12px', color: '#e2e8f0', fontSize: 14, marginBottom: 14, outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 6,
    padding: '10px 12px', color: '#e2e8f0', fontSize: 14, marginBottom: 14, outline: 'none',
  },
  btn: {
    width: '100%', background: '#7c6af7', border: 'none', borderRadius: 6,
    padding: '11px 0', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 6, padding: '10px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 },
  success: { background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 6, padding: '10px 12px', color: '#86efac', fontSize: 13, marginBottom: 14 },
  divider: { textAlign: 'center', color: '#334155', fontSize: 12, margin: '16px 0', position: 'relative' },
  devSection: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b' },
  devLabel: { color: '#334155', fontSize: 11, marginBottom: 8, textAlign: 'center' },
  devBtns: { display: 'flex', gap: 6 },
  devBtn: (color: string): React.CSSProperties => ({
    flex: 1, background: color + '22', border: `1px solid ${color}44`, borderRadius: 4,
    padding: '6px 0', color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  }),
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/live-map', { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');
      setSuccess(`Account created! You can now sign in as ${role}.`);
      setMode('login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Dev quick-login: creates account then logs in
  async function devLogin(devRole: string) {
    const devEmail = `dev-${devRole.toLowerCase()}@venueflow.local`;
    const devPass = 'venueflow_dev_2024';
    setLoading(true); setError('');
    try {
      // Try to register first (ignore 409 if already exists)
      await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: devEmail, password: devPass, role: devRole }),
      });
      await login(devEmail, devPass);
      navigate('/live-map', { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'Dev login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚡ VenueFlow</div>
        <div style={s.subtitle}>Operations Dashboard</div>

        {/* Login / Register tabs */}
        <div style={s.tabs}>
          <button style={s.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
          <button style={s.tab(mode === 'register')} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Create Account</button>
        </div>

        {error && <div style={s.error} role="alert">{error}</div>}
        {success && <div style={s.success} role="status">{success}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} noValidate>
            <label htmlFor="email" style={s.label}>Email</label>
            <input id="email" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} style={s.input} placeholder="admin@venue.com" />
            <label htmlFor="password" style={s.label}>Password</label>
            <input id="password" type="password" required value={password}
              onChange={e => setPassword(e.target.value)} style={s.input} placeholder="••••••••" />
            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} noValidate>
            <label htmlFor="reg-email" style={s.label}>Email</label>
            <input id="reg-email" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} style={s.input} placeholder="staff@venue.com" />
            <label htmlFor="reg-password" style={s.label}>Password</label>
            <input id="reg-password" type="password" required value={password}
              onChange={e => setPassword(e.target.value)} style={s.input} placeholder="Min 8 characters" />
            <label htmlFor="reg-role" style={s.label}>Role</label>
            <select id="reg-role" value={role} onChange={e => setRole(e.target.value)} style={s.select}>
              <option value="ADMIN">Admin — full access</option>
              <option value="STAFF">Staff — monitoring & incidents</option>
              <option value="EMERGENCY">Emergency — SOS & evacuation</option>
            </select>
            <button type="submit" style={s.btn} disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Dev quick-login */}
        <div style={s.devSection}>
          <div style={s.devLabel}>DEV QUICK LOGIN</div>
          <div style={s.devBtns}>
            <button style={s.devBtn('#7c6af7')} onClick={() => devLogin('ADMIN')} disabled={loading}>Admin</button>
            <button style={s.devBtn('#3b82f6')} onClick={() => devLogin('STAFF')} disabled={loading}>Staff</button>
            <button style={s.devBtn('#ef4444')} onClick={() => devLogin('EMERGENCY')} disabled={loading}>Emergency</button>
          </div>
        </div>
      </div>
    </main>
  );
}
