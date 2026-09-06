import React, { useState } from 'react';

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32 },
  logo: { width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #ef4444, #e03060)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(239,68,68,0.35)' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 28, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  input: { width: '100%', maxWidth: 300, padding: '11px 14px', marginBottom: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fafafa', fontSize: 14 },
  button: { width: '100%', maxWidth: 300, padding: '11px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ef4444, #e03060)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, boxShadow: '0 8px 24px rgba(239,68,68,0.3)' },
  error: { color: '#f87171', fontSize: 13, marginTop: 10 },
};

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await window.api.login(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onLogin(result.user);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <div style={styles.logo}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 style={styles.title}>Hourguard</h1>
      <p style={styles.subtitle}>// by HireJPS</p>
      <input
        style={styles.input}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button style={styles.button} type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <p style={styles.error}>{error}</p>}
    </form>
  );
}
