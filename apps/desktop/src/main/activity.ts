import { uIOhook, UiohookKeyboardEvent, UiohookMouseEvent } from 'uiohook-napi';

const EXPECTED_EVENTS_PER_INTERVAL = 1000;

export class ActivityMonitor {
  private keyboardCount = 0;
  private mouseCount = 0;
  private listening = false;

  private onKey = (_e: UiohookKeyboardEvent) => {
    this.keyboardCount++;
  };

  private onMouse = (_e: UiohookMouseEvent) => {
    this.mouseCount++;
  };

  start() {
    if (this.listening) return;
    this.reset();
    uIOhook.on('keydown', this.onKey);
    uIOhook.on('click', this.onMouse);
    uIOhook.on('wheel', this.onMouse);
    uIOhook.start();
    this.listening = true;
  }

  stop() {
    if (!this.listening) return;
    uIOhook.stop();
    uIOhook.removeAllListeners();
    this.listening = false;
  }

  reset() {
    this.keyboardCount = 0;
    this.mouseCount = 0;
  }

  getCounts() {
    return { keyboard: this.keyboardCount, mouse: this.mouseCount };
  }

  getActivityPercent(): number {
    const total = this.keyboardCount + this.mouseCount;
    return Math.min(100, Math.round((total / EXPECTED_EVENTS_PER_INTERVAL) * 100));
  }
}
