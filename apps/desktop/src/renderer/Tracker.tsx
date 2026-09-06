import React, { useState, useEffect, useRef } from 'react';

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: 32, height: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 32 },
  title: { fontSize: 18, fontWeight: 700 },
  logoutBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  timer: { fontSize: 48, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 8 },
  activity: { fontSize: 14, color: '#94a3b8', marginBottom: 32 },
  select: { width: '100%', maxWidth: 300, padding: '10px 14px', marginBottom: 24, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14 },
  startBtn: { width: 120, height: 120, borderRadius: '50%', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },
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
        <span style={styles.title}>Hourguard</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      <div style={styles.timer}>{formatTime(elapsed)}</div>
      <div style={styles.activity}>
        KB: {activity.keyboard} | Mouse: {activity.mouse}
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
          color: '#fff',
        }}
      >
        {tracking ? 'STOP' : 'START'}
      </button>
    </div>
  );
}
