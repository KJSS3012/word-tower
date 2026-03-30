import { randomUUID } from "node:crypto";
import { GameStatus, Difficulty } from "../types/game.types";
import { Player } from "./Player";

export class Game {
  public readonly id: string;
  public readonly difficulty: Difficulty;
  public players: Player[];
  public currentTurnIndex: number;
  public currentWord: string | null;
  public requiredLetter: string | null;
  public status: GameStatus;
  public winnerPlayerId: string | null;
  public readonly usedWords: Set<string>;

  constructor(difficulty: Difficulty) {
    this.id = randomUUID();
    this.difficulty = difficulty;
    this.players = [];
    this.currentTurnIndex = 0;
    this.currentWord = null;
    this.requiredLetter = null;
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
