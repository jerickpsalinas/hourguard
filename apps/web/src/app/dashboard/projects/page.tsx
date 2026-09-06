'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { SkeletonRows } from '@/components/skeleton';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const supabase = createClient();
  const { member } = useAuth();
  const isAdmin = member?.role === 'owner' || member?.role === 'manager';

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
    if (!member) return;
    await supabase.from('hg_projects').update({ is_active: !isActive }).eq('id', id).eq('organization_id', member.organizationId);
    loadProjects();
  }

  const inputClass = 'flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Projects</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// manage projects</p>
      {isAdmin && (
        <form onSubmit={addProject} className="flex gap-3 mb-6">
          <input type="text" placeholder="New project name" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
          <button type="submit" className="btn-brand px-4 py-2.5 text-sm">Add Project</button>
        </form>
      )}
      {loading ? (
        <SkeletonRows count={3} />
      ) : projects.length === 0 ? (
        <p className="text-white/40">No projects yet. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between glass-card p-4">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-white/40">{p.is_active ? 'Active' : 'Archived'}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => toggleProject(p.id, p.is_active)}
                  className="text-sm text-white/40 hover:text-brand transition-colors"
                >
                  {p.is_active ? 'Archive' : 'Restore'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
