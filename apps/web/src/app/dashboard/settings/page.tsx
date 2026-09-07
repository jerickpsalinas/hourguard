'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useAuth } from '@/lib/auth-context';
import { CopyButton } from '@/components/copy-button';
import { SkeletonRows } from '@/components/skeleton';
import { useToast } from '@/components/toast';
import { generateApiKey, sha256Hex } from '@/lib/api-key';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [slackUrl, setSlackUrl] = useState('');
  const [slackSaved, setSlackSaved] = useState('');
  const [slackActive, setSlackActive] = useState(false);
  const [slackLoading, setSlackLoading] = useState(true);
  const supabase = createClient();
  const { member } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      loadApiKeys();
      loadSlackIntegration();
    }
  }, [member]);

  async function loadSlackIntegration() {
    if (!member) return;
    setSlackLoading(true);
    const { data } = await supabase
      .from('hg_integrations')
      .select('*')
      .eq('organization_id', member.organizationId)
      .eq('type', 'slack_webhook')
      .maybeSingle();
    if (data) {
      setSlackUrl(data.config?.webhook_url ?? '');
      setSlackSaved(data.config?.webhook_url ?? '');
      setSlackActive(data.is_active);
    }
    setSlackLoading(false);
  }

  async function saveSlackIntegration(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    const { error } = await supabase
      .from('hg_integrations')
      .upsert({
        organization_id: member.organizationId,
        type: 'slack_webhook',
        config: { webhook_url: slackUrl.trim() },
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,type' });
    if (error) return toast('Failed to save Slack integration.', 'error');
    setSlackSaved(slackUrl.trim());
    setSlackActive(true);
    toast('Slack integration saved.');
  }

  async function testSlack() {
    if (!slackSaved) return;
    try {
      await fetch(slackSaved, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '✅ Hourguard is connected! You will receive tracking notifications here.' }),
      });
      toast('Test message sent to Slack.');
    } catch {
      toast('Failed to send test message.', 'error');
    }
  }

  async function removeSlackIntegration() {
    if (!member) return;
    const { error } = await supabase
      .from('hg_integrations')
      .delete()
      .eq('organization_id', member.organizationId)
      .eq('type', 'slack_webhook');
    if (error) return toast('Failed to remove integration.', 'error');
    setSlackUrl('');
    setSlackSaved('');
    setSlackActive(false);
    toast('Slack integration removed.');
  }

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

    const rawKey = generateApiKey();
    const prefix = rawKey.substring(0, 8);
    const keyHash = await sha256Hex(rawKey);

    const { error } = await supabase.from('hg_api_keys').insert({
      organization_id: member.organizationId,
      name: newKeyName.trim(),
      key_hash: keyHash,
      key_prefix: prefix,
      created_by: member.id,
    });

    if (error) {
      toast('Failed to create API key.', 'error');
      return;
    }

    setGeneratedKey(rawKey);
    setNewKeyName('');
    toast('API key created.');
    loadApiKeys();
  }

  async function revokeKey(id: string, name: string) {
    if (!member) return;
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('hg_api_keys').update({ is_active: false }).eq('id', id).eq('organization_id', member.organizationId);
    if (error) return toast('Failed to revoke key.', 'error');
    toast('API key revoked.');
    loadApiKeys();
  }

  const inputClass = 'flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-brand/50 focus:outline-none focus:ring-1 focus:ring-brand/50 transition-colors';

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">Settings</h1>
      <p className="text-sm text-white/60 font-mono text-xs tracking-wider uppercase mb-6">// configuration</p>

      <div className="mb-8">
        <h2 className="text-lg font-display font-semibold mb-4">API Keys</h2>
        <p className="text-sm text-white/50 mb-4">
          Generate API keys for external integrations (n8n, Zapier, etc.). Pass the key as{' '}
          <code className="text-xs bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded font-mono">Authorization: Bearer &lt;key&gt;</code>
        </p>

        <form onSubmit={createApiKey} className="flex gap-3 mb-4">
          <input type="text" placeholder="Key name (e.g. n8n-integration)" aria-label="API key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className={inputClass} />
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
          <p className="text-white/60">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between glass-card p-4">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-white/60 font-mono">
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
                    <span className="text-xs text-white/55">Revoked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold mb-4">Integrations</h2>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center text-white text-sm font-bold">#</div>
            <div>
              <p className="font-medium">Slack Notifications</p>
              <p className="text-xs text-white/50">Get notified when team members start/stop tracking</p>
            </div>
            {slackActive && slackSaved && (
              <span className="ml-auto text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Connected</span>
            )}
          </div>

          {slackLoading ? (
            <div className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : (
            <>
              <form onSubmit={saveSlackIntegration} className="flex gap-3 mb-3">
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  aria-label="Slack webhook URL"
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  className={inputClass}
                />
                <button type="submit" disabled={!slackUrl.trim()} className="btn-brand px-4 py-2.5 text-sm disabled:opacity-40">
                  Save
                </button>
              </form>
              {slackSaved && (
                <div className="flex gap-2">
                  <button onClick={testSlack} className="text-sm text-white/60 hover:text-white transition-colors">
                    Send test message
                  </button>
                  <span className="text-white/20">|</span>
                  <button onClick={removeSlackIntegration} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    Remove
                  </button>
                </div>
              )}
              <p className="text-xs text-white/40 mt-3">
                Create an Incoming Webhook in your Slack workspace and paste the URL above.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
