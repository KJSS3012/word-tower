import type { GameSnapshot } from "../../types/game.types";

export class GameStore {
  private game: GameSnapshot | null = null;

  set(snapshot: GameSnapshot): void {
    this.game = snapshot;
  }

  get(): GameSnapshot | null {
    return this.game;
  }

  clear(): void {
    this.game = null;
  }
}
