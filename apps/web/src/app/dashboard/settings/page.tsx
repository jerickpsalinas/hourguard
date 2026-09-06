'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { CopyButton } from '@/components/copy-button';
import { SkeletonRows } from '@/components/skeleton';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const supabase = createClient();
  const { member } = useAuth();

  useEffect(() => {
    if (member) loadApiKeys();
  }, [member]);

  async function loadApiKeys() {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('hg_api_keys')
      .select('*')
      .eq('organization_id', member.organizationId)
      .order('created_at', { ascending: false });
    setApiKeys(data ?? []);
    setLoading(false);
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim() || !member) return;

    const rawKey = `hg_${crypto.randomUUID().replace(/-/g, '')}`;
    const prefix = rawKey.substring(0, 8);

    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    await supabase.from('hg_api_keys').insert({
      organization_id: member.organizationId,
      name: newKeyName.trim(),
      key_hash: keyHash,
      key_prefix: prefix,
      created_by: member.id,
    });

    setGeneratedKey(rawKey);
    setNewKeyName('');
    loadApiKeys();
  }

  async function revokeKey(id: string, name: string) {
    if (!member) return;
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    await supabase.from('hg_api_keys').update({ is_active: false }).eq('id', id).eq('organization_id', member.organizationId);
    loadApiKeys();
  }

  const inputClass = 'flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Settings</h1>
      <p className="text-sm text-white/40 font-mono text-xs tracking-wider uppercase mb-6">// configuration</p>

      <div className="mb-8">
        <h2 className="text-lg font-display font-semibold mb-4">API Keys</h2>
        <p className="text-sm text-white/50 mb-4">
          Generate API keys for external integrations (n8n, Zapier, etc.). Pass the key as{' '}
          <code className="text-xs bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded font-mono">Authorization: Bearer &lt;key&gt;</code>
        </p>

        <form onSubmit={createApiKey} className="flex gap-3 mb-4">
          <input type="text" placeholder="Key name (e.g. n8n-integration)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className={inputClass} />
          <button type="submit" className="btn-brand px-4 py-2.5 text-sm">Generate Key</button>
        </form>

        {generatedKey && (
          <div className="mb-4 glass-card border-yellow-500/20 p-4">
            <p className="text-sm mb-1 text-yellow-400">Copy this key now — it won&apos;t be shown again:</p>
            <div className="flex items-start gap-2">
              <code className="text-xs text-yellow-200/80 font-mono break-all flex-1">{generatedKey}</code>
              <CopyButton text={generatedKey} />
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonRows count={2} />
        ) : apiKeys.length === 0 ? (
          <p className="text-white/40">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between glass-card p-4">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-white/40 font-mono">
                    {key.key_prefix}... | Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && ` | Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div>
                  {key.is_active ? (
                    <button onClick={() => revokeKey(key.id, key.name)} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                      Revoke
                    </button>
                  ) : (
                    <span className="text-xs text-white/30">Revoked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
