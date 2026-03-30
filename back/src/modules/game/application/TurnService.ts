import { Player } from "../domain/Player";

export class TurnService {
  getNextTurnIndex(players: Player[], currentIndex: number): number {
    if (players.length === 0) return 0;

    const totalPlayers = players.length;
    let nextIndex = currentIndex;

    for (let i = 0; i < totalPlayers; i += 1) {
      nextIndex = (nextIndex + 1) % totalPlayers;
      if (players[nextIndex]?.isActive) {
        return nextIndex;
      }
    }

    return currentIndex;
  }
}
