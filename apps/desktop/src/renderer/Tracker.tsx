import React, { useState, useEffect, useRef } from 'react';

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: 32, height: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 36 },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  logo: { width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #ef4444, #e03060)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' },
  logoutBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 },
  timer: { fontSize: 52, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 12, letterSpacing: '-0.02em' },
  activity: { display: 'flex', gap: 8, marginBottom: 32 },
  pill: { fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '4px 12px' },
  select: { width: '100%', maxWidth: 300, padding: '11px 14px', marginBottom: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fafafa', fontSize: 14 },
  startBtn: { width: 128, height: 128, borderRadius: '50%', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', color: '#fff', letterSpacing: '0.05em' },
  statusDot: { display: 'inline-block', width: 8, height: 8, borderRadius: 999, marginRight: 6 },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Tracker({ onLogout }: { onLogout: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activity, setActivity] = useState({ keyboard: 0, mouse: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    window.api.getProjects().then(setProjects);
    window.api.getStatus().then((status) => {
      if (status.state === 'tracking') {
        setTracking(true);
        if (status.intervalStart) {
          const diff = Math.floor((Date.now() - new Date(status.intervalStart).getTime()) / 1000);
          setElapsed(diff);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (tracking) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
        window.api.getStatus().then((s) => setActivity(s.activity));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tracking]);

  const toggle = async () => {
    if (tracking) {
      await window.api.stopTracking();
      setTracking(false);
    } else {
      await window.api.startTracking(selectedProject || undefined);
      setTracking(true);
    }
  };

  const handleLogout = async () => {
    await window.api.logout();
    onLogout();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span style={styles.title}>Hourguard</span>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        <span style={{ ...styles.statusDot, background: tracking ? '#22c55e' : 'rgba(255,255,255,0.3)' }} />
        {tracking ? 'Tracking' : 'Idle'}
      </div>
      <div style={styles.timer}>{formatTime(elapsed)}</div>
      <div style={styles.activity}>
        <span style={styles.pill}>⌨ {activity.keyboard}</span>
        <span style={styles.pill}>🖱 {activity.mouse}</span>
      </div>

      {!tracking && (
        <select
          style={styles.select}
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <button
        onClick={toggle}
        style={{
          ...styles.startBtn,
          background: tracking ? '#ef4444' : '#22c55e',
          boxShadow: tracking ? '0 8px 32px rgba(239,68,68,0.4)' : '0 8px 32px rgba(34,197,94,0.35)',
        }}
      >
        {tracking ? 'STOP' : 'START'}
      </button>
    </div>
  );
}
