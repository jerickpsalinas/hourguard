'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const supabase = createClient();

  useEffect(() => { loadApiKeys(); }, []);

  async function getMembership() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: member } = await supabase
      .from('hg_members')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single();
    return member;
  }

  async function loadApiKeys() {
    const m = await getMembership();
    if (!m) return;

    const { data } = await supabase
      .from('hg_api_keys')
      .select('*')
      .eq('organization_id', m.organization_id)
      .order('created_at', { ascending: false });

    setApiKeys(data ?? []);
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const m = await getMembership();
    if (!m) return;

    const rawKey = `hg_${crypto.randomUUID().replace(/-/g, '')}`;
    const prefix = rawKey.substring(0, 8);

    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    await supabase.from('hg_api_keys').insert({
      organization_id: m.organization_id,
      name: newKeyName.trim(),
      key_hash: keyHash,
      key_prefix: prefix,
      created_by: m.id,
    });

    setGeneratedKey(rawKey);
    setNewKeyName('');
    loadApiKeys();
  }

  async function revokeKey(id: string) {
    await supabase.from('hg_api_keys').update({ is_active: false }).eq('id', id);
    loadApiKeys();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">API Keys</h2>
        <p className="text-sm text-slate-400 mb-4">
          Generate API keys for external integrations (n8n, Zapier, etc.). Pass the key as{' '}
          <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code>
        </p>

        <form onSubmit={createApiKey} className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Key name (e.g. n8n-integration)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-700">
            Generate Key
          </button>
        </form>

        {generatedKey && (
          <div className="mb-4 rounded-lg border border-yellow-800 bg-yellow-900/20 p-4">
            <p className="text-sm mb-1 text-yellow-400">Copy this key now — it won&apos;t be shown again:</p>
            <code className="text-xs text-yellow-200 break-all">{generatedKey}</code>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="text-xs text-slate-400">
                  {key.key_prefix}... | Created {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && ` | Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              <div>
                {key.is_active ? (
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Revoked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
