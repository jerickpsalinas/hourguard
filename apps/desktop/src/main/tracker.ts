import { captureScreenshot } from './screenshot';
import { ActivityMonitor } from './activity';
import { IdleDetector } from './idle';
import { SyncManager } from './sync';

export type TrackerState = 'idle' | 'tracking' | 'paused';

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export class Tracker {
  private state: TrackerState = 'idle';
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private screenshotTimer: ReturnType<typeof setTimeout> | null = null;
  private currentEntryId: string | null = null;
  private projectId: string | null = null;
  private intervalStart: Date | null = null;
  private autoPaused = false;
  private activityMonitor: ActivityMonitor;
  private idleDetector: IdleDetector;
  private sync: SyncManager;
  private onStateChange: (state: TrackerState) => void;

  constructor(sync: SyncManager, onStateChange: (state: TrackerState) => void = () => {}) {
    this.sync = sync;
    this.onStateChange = onStateChange;
    this.activityMonitor = new ActivityMonitor();
    this.idleDetector = new IdleDetector(
      () => {
        // User went idle while tracking — pause and remember it was automatic.
        if (this.state === 'tracking') {
          this.autoPaused = true;
          this.pause();
        }
      },
      () => {
        // User returned — resume only if we auto-paused (never override a manual stop).
        if (this.state === 'paused' && this.autoPaused) {
          this.autoPaused = false;
          this.resume();
        }
      }
    );
  }

  private setState(state: TrackerState) {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange(state);
  }

  async start(projectId?: string) {
    if (this.state === 'tracking') return;

    this.projectId = projectId ?? null;
    this.autoPaused = false;
    this.setState('tracking');
    this.activityMonitor.start();
    this.idleDetector.start();
    this.intervalStart = new Date();

    this.currentEntryId = await this.sync.createTimeEntry(
      this.intervalStart.toISOString(),
      this.projectId
    );

    this.scheduleScreenshot();

    this.intervalTimer = setInterval(() => this.onInterval(), INTERVAL_MS);
  }

  async stop() {
    if (this.state === 'idle') return;

    this.autoPaused = false;
    await this.finalizeInterval();
    this.cleanup();
    this.setState('idle');
  }

  pause() {
    if (this.state !== 'tracking') return;

    this.finalizeInterval();
    this.setState('paused');

    // Clear the finalized interval so a subsequent stop() can't re-finalize it.
    this.currentEntryId = null;
    this.intervalStart = null;

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.screenshotTimer) {
      clearTimeout(this.screenshotTimer);
      this.screenshotTimer = null;
    }
  }

  resume() {
    if (this.state !== 'paused') return;
    this.start(this.projectId ?? undefined);
  }

  isTracking() {
    return this.state === 'tracking';
  }

  getStatus() {
    return {
      state: this.state,
      projectId: this.projectId,
      intervalStart: this.intervalStart?.toISOString() ?? null,
      activity: this.activityMonitor.getCounts(),
    };
  }

  private async onInterval() {
    await this.finalizeInterval();

    this.activityMonitor.reset();
    this.intervalStart = new Date();

    this.currentEntryId = await this.sync.createTimeEntry(
      this.intervalStart.toISOString(),
      this.projectId
    );

    this.scheduleScreenshot();
  }

  private scheduleScreenshot() {
    // Clear any still-pending capture so intervals can't stack timers.
    if (this.screenshotTimer) clearTimeout(this.screenshotTimer);
    const randomOffset = Math.floor(Math.random() * INTERVAL_MS);
    this.screenshotTimer = setTimeout(async () => {
      if (this.state !== 'tracking' || !this.currentEntryId) return;

      const buffer = await captureScreenshot();
      if (buffer) {
        const activity = this.activityMonitor.getActivityPercent();
        await this.sync.uploadScreenshot(
          this.currentEntryId,
          buffer,
          activity
        );
      }
    }, randomOffset);
  }

  private async finalizeInterval() {
    if (!this.currentEntryId || !this.intervalStart) return;

    const counts = this.activityMonitor.getCounts();
    const activityPercent = this.activityMonitor.getActivityPercent();

    await this.sync.updateTimeEntry(this.currentEntryId, {
      stopped_at: new Date().toISOString(),
      keyboard_events: counts.keyboard,
      mouse_events: counts.mouse,
      activity_percent: activityPercent,
    });
  }

  private cleanup() {
    this.activityMonitor.stop();
    this.idleDetector.stop();
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.screenshotTimer) clearTimeout(this.screenshotTimer);
    this.intervalTimer = null;
    this.screenshotTimer = null;
    this.currentEntryId = null;
    this.projectId = null;
    this.intervalStart = null;
  }
}
