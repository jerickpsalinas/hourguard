import React, { useState } from 'react';

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32 },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 32 },
  input: { width: '100%', maxWidth: 300, padding: '10px 14px', marginBottom: 12, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14 },
  button: { width: '100%', maxWidth: 300, padding: '10px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
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
      <h1 style={styles.title}>Hourguard</h1>
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
