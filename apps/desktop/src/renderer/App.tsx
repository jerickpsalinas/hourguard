import React, { useState, useEffect } from 'react';
import Login from './Login';
import Tracker from './Tracker';

declare global {
  interface Window {
    api: {
      login: (email: string, password: string) => Promise<{ user?: any; error?: string }>;
      logout: () => Promise<void>;
      getSession: () => Promise<{ user: any | null }>;
      startTracking: (projectId?: string) => Promise<void>;
      stopTracking: () => Promise<void>;
      getStatus: () => Promise<any>;
      getProjects: () => Promise<any[]>;
    };
  }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.getSession().then(({ user }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Tracker onLogout={() => setUser(null)} />;
}
