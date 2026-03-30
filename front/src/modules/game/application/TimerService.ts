export class TimerService {
  private timerId: number | null = null;

  start(durationInSeconds: number, onTick: (remaining: number) => void, onFinish: () => void): void {
    this.stop();

    let remaining = durationInSeconds;
    onTick(remaining);

    this.timerId = window.setInterval(() => {
      remaining -= 1;
      onTick(Math.max(remaining, 0));

      if (remaining <= 0) {
        this.stop();
        onFinish();
      }
    }, 1000);
  }

  stop(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
