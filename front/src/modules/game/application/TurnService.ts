import type { PlayerView } from "../types/game.types";

export class TurnService {
  findCurrentPlayer(players: PlayerView[], currentPlayerId: string | null): PlayerView | null {
    if (!currentPlayerId) return null;
    return players.find((player) => player.id === currentPlayerId) ?? null;
  }
}
