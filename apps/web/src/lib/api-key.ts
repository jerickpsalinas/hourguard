// Shared API-key helpers. Key generation and hashing must stay identical on the
// client (Settings, where keys are created) and the server (auth, where they're
// looked up) — a drift here would make every key fail to authenticate.

// SHA-256 hex digest via Web Crypto (available in the browser and in the Node/
// edge runtimes Next uses).
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// A fresh raw API key, e.g. "hg_3f9a...". The first 8 chars are stored in
// plaintext as a display prefix; only the hash is persisted.
export function generateApiKey(): string {
  return `hg_${crypto.randomUUID().replace(/-/g, '')}`;
}
