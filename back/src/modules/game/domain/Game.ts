import { randomUUID } from "node:crypto";
import { GameStatus, Difficulty, GameSettings } from "../types/game.types";
import { Player } from "./Player";

export class Game {
  public readonly id: string;
  public difficulty: Difficulty;
  public settings: GameSettings;
  public players: Player[];
  public currentTurnIndex: number;
  public currentWord: string | null;
  public requiredLetter: string | null;
  public remainingTurnSeconds: number;
  public status: GameStatus;
  public winnerPlayerId: string | null;
  public readonly usedWords: Set<string>;

  constructor(difficulty: Difficulty) {
    this.id = randomUUID();
    this.difficulty = difficulty;
    this.settings = {
      turnTimeSeconds: 30,
      wrongAnswerPenalty: 5,
      maxPlayersEnabled: false,
      maxPlayers: 8,
    };
    this.players = [];
    this.currentTurnIndex = 0;
    this.currentWord = null;
    this.requiredLetter = null;
    this.remainingTurnSeconds = 0;
    this.status = GameStatus.WAITING;
    this.winnerPlayerId = null;
    this.usedWords = new Set<string>();
  }

  addPlayer(player: Player): void {
    this.players.push(player);
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter((player) => player.id !== playerId);

    if (this.currentTurnIndex >= this.players.length) {
      this.currentTurnIndex = 0;
    }
  }

  getActivePlayers(): Player[] {
    return this.players.filter((player) => player.isActive);
  }

  getCurrentPlayer(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.currentTurnIndex] ?? null;
  }
}
