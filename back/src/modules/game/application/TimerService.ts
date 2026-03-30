export class TimerService {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  start(gameId: string, durationMs: number, onTimeout: () => void): void {
    this.stop(gameId);

    const timeout = setTimeout(() => {
      this.timers.delete(gameId);
      onTimeout();
    }, durationMs);

    this.timers.set(gameId, timeout);
  }

  stop(gameId: string): void {
    const timeout = this.timers.get(gameId);

    if (!timeout) return;

    clearTimeout(timeout);
    this.timers.delete(gameId);
  }

  clearAll(): void {
    for (const timeout of this.timers.values()) {
      clearTimeout(timeout);
    }

    this.timers.clear();
  }
}
