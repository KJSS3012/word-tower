import { Player } from "./Player";
import type { GameSnapshot, FrontGameState } from "../types/game.types";
import { DictionaryService } from "../infrastructure/dictionary/DictionaryService";

export class Game {
  static toFrontState(snapshot: GameSnapshot, dictionaryService: DictionaryService): FrontGameState {
    const players = snapshot.players.map((player) => Player.fromDTO(player).toView());
    const currentPlayer = players.find((player) => player.id === snapshot.currentPlayerId) ?? null;
    const winnerPlayer = players.find((player) => player.id === snapshot.winnerPlayerId) ?? null;

    const currentWord = snapshot.currentWord ?? "";
    const nextLetter = snapshot.requiredLetter ?? "";
    const nextLetterIndex = dictionaryService.resolveRequiredLetterIndex(
      currentWord,
      nextLetter,
      snapshot.difficulty,
    );

    return {
      gameId: snapshot.gameId,
      difficulty: snapshot.difficulty,
      gameStarted: snapshot.status === "IN_PROGRESS",
      players,
      currentWord,
      nextLetter,
      nextLetterIndex,
      remainingTurnSeconds: snapshot.remainingTurnSeconds,
      currentPlayer,
      winnerPlayerId: snapshot.winnerPlayerId,
      winnerPlayerName: winnerPlayer?.name ?? "",
      settings: {
        turnTimeSeconds: snapshot.settings.turnTimeSeconds,
        difficulty: snapshot.difficulty,
        wrongAnswerPenalty: snapshot.settings.wrongAnswerPenalty,
        maxPlayersEnabled: snapshot.settings.maxPlayersEnabled,
        maxPlayers: snapshot.settings.maxPlayers,
      },
    };
  }
}
