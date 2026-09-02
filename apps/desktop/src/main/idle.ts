import { powerMonitor } from 'electron';

export class IdleDetector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private onIdle: (seconds: number) => void;

  constructor(onIdle: (seconds: number) => void) {
    this.onIdle = onIdle;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      if (idleTime > 300) {
        this.onIdle(idleTime);
      }
    }, 30_000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
