import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
  },
  card: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 12,
    padding: 40,
    width: 360,
  },
  logo: { fontSize: 22, fontWeight: 700, color: '#7c6af7', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#475569', marginBottom: 32 },
  label: { display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 },
  input: {
    width: '100%',
    background: '#0f1117',
    border: '1px solid #2d3148',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
  },
  btn: {
    width: '100%',
    background: '#7c6af7',
    border: 'none',
    borderRadius: 6,
    padding: '11px 0',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 16,
  },
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/live-map', { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>VenueFlow</div>
        <div style={styles.subtitle}>Operations Dashboard</div>
        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email" style={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            aria-required="true"
          />
          <label htmlFor="password" style={styles.label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            aria-required="true"
          />
          <button type="submit" style={styles.btn} disabled={loading} aria-busy={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
