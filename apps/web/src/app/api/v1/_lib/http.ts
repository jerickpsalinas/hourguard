import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

// Log the real error server-side; return a generic message so PostgREST/Postgres
// internals (constraint names, column types) never reach the client.
export function serverError(context: string, error: unknown): NextResponse {
  console.error(`[api] ${context}:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
