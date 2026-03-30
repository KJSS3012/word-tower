import { Game } from "../../domain/Game";

export class GameStore {
  private readonly games = new Map<string, Game>();

  create(gameId: string, game: Game): Game {
    this.games.set(gameId, game);
    return game;
  }

  findById(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  findByPlayerSocketId(socketId: string): { gameId: string; game: Game } | null {
    for (const [gameId, game] of this.games.entries()) {
      if (game.players.some((player) => player.socketId === socketId)) {
        return { gameId, game };
      }
    }

    return null;
  }

  delete(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  list(): Game[] {
    return Array.from(this.games.values());
  }
}
