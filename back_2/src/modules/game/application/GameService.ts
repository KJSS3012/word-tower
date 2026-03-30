import { Game } from "../domain/Game";
import { Player } from "../domain/Player";
import { GameRules } from "../rules/GameRules";
import { Difficulty, SubmitWordResult } from "../types/game.types";
import { DictionaryService } from "../infrastructure/dictionary/DictionaryService";
import { GameStore } from "../infrastructure/store/GameStore";
import { TurnService } from "./TurnService";

export class GameService {
  constructor(
    private readonly gameStore: GameStore,
    private readonly dictionaryService: DictionaryService,
    private readonly turnService: TurnService,
  ) { }

  createGame(difficulty: Difficulty): Game {
    const game = new Game(difficulty);
    return this.gameStore.create(game);
  }

  addPlayer(gameId: string, name: string, socketId: string, isHost: boolean = false): Player | null {
    const game = this.gameStore.findById(gameId);
    if (!game) return null;

    const player = new Player(name, socketId, isHost);
    game.addPlayer(player);
    return player;
  }

  startGame(gameId: string): boolean {
    const game = this.gameStore.findById(gameId);
    if (!game) return false;

    const initialWord = this.dictionaryService.pickRandomWord(game.difficulty);
    const initialLetter = GameRules.getNextRequiredLetter(
      initialWord,
      game.difficulty,
      (word) => this.dictionaryService.pickRandomLetter(word),
    );

    game.currentWord = initialWord;
    game.requiredLetter = initialLetter;
    game.usedWords.add(initialWord.toLowerCase());
    game.currentTurnIndex = 0;
    return true;
  }

  submitWord(gameId: string, playerId: string, word: string): SubmitWordResult {
    const game = this.gameStore.findById(gameId);
    if (!game) return { success: false, reason: "GAME_NOT_FOUND" };

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, reason: "NOT_PLAYER_TURN" };
    }

    const normalizedWord = GameRules.normalizeWord(word);
    if (!this.dictionaryService.isValidWord(normalizedWord, game.difficulty)) {
      return { success: false, reason: "WORD_NOT_IN_DICTIONARY" };
    }

    if (!GameRules.startsWithRequiredLetter(normalizedWord, game.requiredLetter)) {
      return { success: false, reason: "INVALID_REQUIRED_LETTER" };
    }

    if (!GameRules.isNewWord(normalizedWord, game.usedWords)) {
      return { success: false, reason: "WORD_ALREADY_USED" };
    }

    game.currentWord = normalizedWord;
    game.requiredLetter = GameRules.getNextRequiredLetter(
      normalizedWord,
      game.difficulty,
      (nextWord) => this.dictionaryService.pickRandomLetter(nextWord),
    );
    game.usedWords.add(normalizedWord);
    game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);

    return { success: true };
  }

  eliminatePlayer(gameId: string, playerId: string): boolean {
    const game = this.gameStore.findById(gameId);
    if (!game) return false;

    const player = game.players.find((item) => item.id === playerId);
    if (!player) return false;

    player.isActive = false;
    return true;
  }

  nextTurn(gameId: string): boolean {
    const game = this.gameStore.findById(gameId);
    if (!game) return false;

    game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);
    return true;
  }
}
