import { powerMonitor } from 'electron';

const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes
const POLL_MS = 15_000;

// Reports transitions across the idle threshold, so the tracker can auto-pause
// when the user walks away and auto-resume when they return.
export class IdleDetector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private wasIdle = false;
  private onIdle: (seconds: number) => void;
  private onActive: () => void;

  constructor(onIdle: (seconds: number) => void, onActive: () => void = () => {}) {
    this.onIdle = onIdle;
    this.onActive = onActive;
  }

  start() {
    if (this.timer) return;
    this.wasIdle = false;
    this.timer = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      const isIdle = idleTime > IDLE_THRESHOLD_SECONDS;

      if (isIdle && !this.wasIdle) {
        this.wasIdle = true;
        this.onIdle(idleTime);
      } else if (!isIdle && this.wasIdle) {
        this.wasIdle = false;
        this.onActive();
      }
    }, POLL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.wasIdle = false;
  }
}
