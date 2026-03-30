import { Game } from "../../domain/Game";

export class GameStore {
  private readonly games = new Map<string, Game>();

  create(game: Game): Game {
    this.games.set(game.id, game);
    return game;
  }

  findById(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  delete(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  list(): Game[] {
    return Array.from(this.games.values());
  }
}
