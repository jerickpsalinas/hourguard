'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const supabase = createClient();
  const { member } = useAuth();

  useEffect(() => {
    if (member) loadProjects();
  }, [member]);

  async function loadProjects() {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('hg_projects')
      .select('*')
      .eq('organization_id', member.organizationId)
      .order('created_at', { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !member) return;
    await supabase.from('hg_projects').insert({
      organization_id: member.organizationId,
      name: newName.trim(),
    });
    setNewName('');
    loadProjects();
  }

  async function toggleProject(id: string, isActive: boolean) {
    await supabase.from('hg_projects').update({ is_active: !isActive }).eq('id', id);
    loadProjects();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Projects</h1>
      <form onSubmit={addProject} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="New project name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-700">
          Add Project
        </button>
      </form>
      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-slate-400">No projects yet. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-slate-400">{p.is_active ? 'Active' : 'Archived'}</p>
              </div>
              <button
                onClick={() => toggleProject(p.id, p.is_active)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {p.is_active ? 'Archive' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
