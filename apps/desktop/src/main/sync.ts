import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeStorage } from 'electron';
import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';
import type { Database as DbTypes } from '@hourguard/shared';

// electron-vite statically injects MAIN_VITE_* vars into the main bundle at
// build time (import.meta.env). process.env is only populated in the dev shell
// and is empty in a packaged app, so import.meta.env must be the primary source.
const SUPABASE_URL =
  import.meta.env.MAIN_VITE_SUPABASE_URL || process.env.MAIN_VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY || process.env.MAIN_VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Fail loud in dev; a packaged build without these baked in cannot talk to Supabase.
  console.error(
    '[Hourguard] Missing MAIN_VITE_SUPABASE_URL / MAIN_VITE_SUPABASE_ANON_KEY. ' +
      'Set them in .env before building the desktop app.'
  );
}

export class SyncManager {
  private supabase: SupabaseClient<DbTypes>;
  private localDb: Database.Database;
  private authUserId: string | null = null;
  private memberId: string | null = null;
  private orgId: string | null = null;

  constructor() {
    this.supabase = createClient<DbTypes>(SUPABASE_URL, SUPABASE_KEY);

    const dbPath = join(app.getPath('userData'), 'offline-queue.db');
    this.localDb = new Database(dbPath);
    this.initLocalDb();
  }

  private initLocalDb() {
    this.localDb.exec(`
      create table if not exists pending_entries (
        id text primary key,
        payload text not null,
        type text not null,
        created_at text default (datetime('now'))
      )
    `);
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    if (data.session?.refresh_token && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(data.session.refresh_token);
      this.localDb.prepare(
        "insert or replace into pending_entries (id, payload, type) values ('refresh_token', ?, 'token')"
      ).run(encrypted.toString('base64'));
    }

    await this.loadProfile();
    // Sync anything queued while offline (fire-and-forget).
    this.flushPendingEntries().catch(() => {});
    return { user: data.user };
  }

  async logout() {
    this.authUserId = null;
    this.memberId = null;
    this.orgId = null;
    await this.supabase.auth.signOut();
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session) {
      await this.loadProfile();
      this.flushPendingEntries().catch(() => {});
      return { user: data.session.user };
    }

    const tokenRow = this.localDb.prepare(
      "select payload from pending_entries where id = 'refresh_token'"
    ).get() as { payload: string } | undefined;

    if (tokenRow && safeStorage.isEncryptionAvailable()) {
      const refreshToken = safeStorage.decryptString(
        Buffer.from(tokenRow.payload, 'base64')
      );
      const { data: refreshData } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (refreshData.session) {
        await this.loadProfile();
        this.flushPendingEntries().catch(() => {});
        return { user: refreshData.session.user };
      }
    }

    return { user: null };
  }

  private async loadProfile() {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    this.authUserId = user.id;

    const { data: member } = await this.supabase
      .from('hg_members')
      .select('id, organization_id')
      .eq('auth_user_id', user.id)
      .single();

    this.memberId = member?.id ?? null;
    this.orgId = member?.organization_id ?? null;
  }

  async getProjects() {
    if (!this.orgId) return [];
    const { data } = await this.supabase
      .from('hg_projects')
      .select('*')
      .eq('organization_id', this.orgId)
      .eq('is_active', true);
    return data ?? [];
  }

  async createTimeEntry(startedAt: string, projectId: string | null): Promise<string> {
    if (!this.memberId || !this.orgId) throw new Error('Not authenticated');

    const entry = {
      member_id: this.memberId,
      organization_id: this.orgId,
      project_id: projectId,
      started_at: startedAt,
    };

    const { data, error } = await this.supabase
      .from('hg_time_entries')
      .insert(entry)
      .select('id')
      .single();

    if (error || !data) {
      const id = crypto.randomUUID();
      this.localDb.prepare(
        "insert into pending_entries (id, payload, type) values (?, ?, 'time_entry')"
      ).run(id, JSON.stringify({ ...entry, id }));
      return id;
    }

    return data.id;
  }

  async updateTimeEntry(
    id: string,
    updates: {
      stopped_at: string;
      keyboard_events: number;
      mouse_events: number;
      activity_percent: number;
    }
  ) {
    const { error } = await this.supabase
      .from('hg_time_entries')
      .update(updates)
      .eq('id', id);

    if (error) {
      this.localDb.prepare(
        "insert or replace into pending_entries (id, payload, type) values (?, ?, 'time_entry_update')"
      ).run(id, JSON.stringify({ id, ...updates }));
    }
  }

  async uploadScreenshot(
    timeEntryId: string,
    buffer: Buffer,
    activityPercent: number
  ) {
    if (!this.memberId || !this.orgId) return;

    const filename = `${this.orgId}/${this.memberId}/${Date.now()}.jpg`;

    const { error: uploadError } = await this.supabase.storage
      .from('screenshots')
      .upload(filename, buffer, { contentType: 'image/jpeg' });

    if (uploadError) {
      this.localDb.prepare(
        "insert into pending_entries (id, payload, type) values (?, ?, 'screenshot')"
      ).run(
        crypto.randomUUID(),
        JSON.stringify({
          time_entry_id: timeEntryId,
          buffer: buffer.toString('base64'),
          activity_percent: activityPercent,
          filename,
        })
      );
      return;
    }

    await this.supabase.from('hg_screenshots').insert({
      time_entry_id: timeEntryId,
      member_id: this.memberId,
      organization_id: this.orgId,
      storage_path: filename,
      captured_at: new Date().toISOString(),
      activity_percent: activityPercent,
    });
  }

  async flushPendingEntries() {
    // Screenshot rows need an authenticated member/org context to insert.
    if (!this.memberId || !this.orgId) return;

    const rows = this.localDb.prepare(
      "select * from pending_entries where type != 'token' order by created_at"
    ).all() as Array<{ id: string; payload: string; type: string }>;

    for (const row of rows) {
      let payload: any;
      try {
        payload = JSON.parse(row.payload);
      } catch {
        // Corrupt row — drop it so it can't block the queue forever.
        this.localDb.prepare("delete from pending_entries where id = ?").run(row.id);
        continue;
      }
      let success = false;

      try {
      if (row.type === 'time_entry') {
        const { error } = await this.supabase.from('hg_time_entries').upsert(payload);
        success = !error;
      } else if (row.type === 'time_entry_update') {
        const { id, ...updates } = payload;
        const { error } = await this.supabase.from('hg_time_entries').update(updates).eq('id', id);
        success = !error;
      } else if (row.type === 'screenshot') {
        const buf = Buffer.from(payload.buffer, 'base64');
        const { error } = await this.supabase.storage
          .from('screenshots')
          .upload(payload.filename, buf, { contentType: 'image/jpeg' });
        if (!error) {
          await this.supabase.from('hg_screenshots').insert({
            time_entry_id: payload.time_entry_id,
            member_id: this.memberId!,
            organization_id: this.orgId!,
            storage_path: payload.filename,
            captured_at: new Date().toISOString(),
            activity_percent: payload.activity_percent,
          });
          success = true;
        }
      }
      } catch {
        // Network/transient error — leave the row queued for the next flush.
        success = false;
      }

      if (success) {
        this.localDb.prepare("delete from pending_entries where id = ?").run(row.id);
      }
    }
  }
}
