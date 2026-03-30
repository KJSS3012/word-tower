import { Game } from "../domain/Game";
import { Player } from "../domain/Player";
import { GameRules } from "../rules/GameRules";
import {
  Difficulty,
  GameSnapshot,
  GameStatus,
  PlayerDTO,
  StartGameResult,
  SubmitWordResult,
  UpdateSettingsPayload,
  UpdateSettingsResult,
} from "../types/game.types";
import { DictionaryService } from "../infrastructure/dictionary/DictionaryService";
import { GameStore } from "../infrastructure/store/GameStore";
import { TurnService } from "./TurnService";

const AUTO_RESET_DELAY_MS = 3000;

interface AddPlayerResult {
  player?: Player;
  reason?: string;
}

interface RemovePlayerResult {
  gameId: string;
  roomDeleted: boolean;
  game?: GameSnapshot;
  shouldScheduleReset?: boolean;
}

export class GameService {
  constructor(
    private readonly gameStore: GameStore,
    private readonly dictionaryService: DictionaryService,
    private readonly turnService: TurnService,
  ) { }

  createGame(gameId: string, difficulty: Difficulty = "normal"): Game {
    const game = new Game(difficulty);
    return this.gameStore.create(gameId, game);
  }

  getGame(gameId: string): Game | undefined {
    return this.gameStore.findById(gameId);
  }

  getGameSnapshot(gameId: string): GameSnapshot | null {
    const game = this.gameStore.findById(gameId);
    if (!game) return null;

    return this.toSnapshot(gameId, game);
  }

  addPlayer(gameId: string, name: string, socketId: string, isHost: boolean = false): AddPlayerResult {
    const game = this.gameStore.findById(gameId);
    if (!game) return { reason: "GAME_NOT_FOUND" };

    if (game.settings.maxPlayersEnabled && game.players.length >= game.settings.maxPlayers) {
      return { reason: "ROOM_FULL" };
    }

    const player = new Player(name, socketId, isHost);
    if (game.status === GameStatus.IN_PROGRESS) {
      player.isActive = false;
    }

    game.addPlayer(player);
    return { player };
  }

  startGame(gameId: string): StartGameResult {
    const game = this.gameStore.findById(gameId);
    if (!game) {
      return { success: false, reason: "GAME_NOT_FOUND" };
    }

    if (game.getActivePlayers().length < 2) {
      return {
        success: false,
        reason: "Sao necessarios pelo menos 2 jogadores para iniciar a partida.",
      };
    }

    const initialWord = this.dictionaryService.pickRandomWord(game.difficulty);
    const initialLetter = GameRules.getNextRequiredLetter(
      initialWord,
      game.difficulty,
      (word) => this.dictionaryService.pickRandomLetter(word),
    );

    game.players.forEach((player) => {
      player.isActive = true;
    });

    game.currentWord = initialWord;
    game.requiredLetter = initialLetter;
    game.remainingTurnSeconds = game.settings.turnTimeSeconds;
    game.status = GameStatus.IN_PROGRESS;
    game.winnerPlayerId = null;
    game.usedWords.clear();
    game.usedWords.add(initialWord.toLowerCase());
    game.currentTurnIndex = 0;

    return {
      success: true,
      game: this.toSnapshot(gameId, game),
    };
  }

  updateSettings(gameId: string, actorSocketId: string, payload: UpdateSettingsPayload): UpdateSettingsResult {
    const game = this.gameStore.findById(gameId);
    if (!game) {
      return { success: false, reason: "GAME_NOT_FOUND" };
    }

    const actor = game.players.find((player) => player.socketId === actorSocketId);
    if (!actor || !actor.isHost) {
      return { success: false, reason: "ONLY_HOST_CAN_UPDATE_SETTINGS" };
    }

    if (payload.difficulty && game.status === GameStatus.IN_PROGRESS) {
      return { success: false, reason: "CANNOT_CHANGE_DIFFICULTY_DURING_GAME" };
    }

    const nextSettings = { ...game.settings };
    let nextDifficulty = game.difficulty;

    if (typeof payload.turnTimeSeconds === "number") {
      const nextTurnTimeSeconds = Math.min(120, Math.max(10, Math.floor(payload.turnTimeSeconds)));
      nextSettings.turnTimeSeconds = nextTurnTimeSeconds;

      if (game.status === GameStatus.IN_PROGRESS) {
        game.remainingTurnSeconds = Math.min(game.remainingTurnSeconds, nextTurnTimeSeconds);
      }
    }

    if (typeof payload.wrongAnswerPenalty === "number") {
      nextSettings.wrongAnswerPenalty = Math.min(10, Math.max(1, Math.floor(payload.wrongAnswerPenalty)));
    }

    if (typeof payload.maxPlayersEnabled === "boolean") {
      nextSettings.maxPlayersEnabled = payload.maxPlayersEnabled;
    }

    if (typeof payload.maxPlayers === "number") {
      nextSettings.maxPlayers = Math.min(12, Math.max(2, Math.floor(payload.maxPlayers)));
    }

    if (payload.difficulty) {
      nextDifficulty = payload.difficulty;
    }

    if (nextSettings.maxPlayersEnabled && game.players.length > nextSettings.maxPlayers) {
      return {
        success: false,
        reason: "MAX_PLAYERS_LOWER_THAN_CURRENT_PLAYERS",
      };
    }

    game.settings = nextSettings;
    game.difficulty = nextDifficulty;

    return {
      success: true,
      game: this.toSnapshot(gameId, game),
    };
  }

  removePlayerBySocketId(socketId: string): RemovePlayerResult | null {
    const gameLookup = this.gameStore.findByPlayerSocketId(socketId);
    if (!gameLookup) return null;

    const { gameId, game } = gameLookup;
    const playerToRemove = game.players.find((player) => player.socketId === socketId);

    if (!playerToRemove) return null;

    const removedPlayerId = playerToRemove.id;
    const removedHost = playerToRemove.isHost;

    game.removePlayer(removedPlayerId);

    if (game.players.length === 0) {
      this.gameStore.delete(gameId);
      return {
        gameId,
        roomDeleted: true,
      };
    }

    if (removedHost) {
      game.players.forEach((player, index) => {
        player.isHost = index === 0;
      });
    }

    if (game.status === GameStatus.IN_PROGRESS) {
      const currentPlayer = game.getCurrentPlayer();
      if (!currentPlayer || !currentPlayer.isActive) {
        game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);
        game.remainingTurnSeconds = game.settings.turnTimeSeconds;
      }
    }

    const shouldScheduleReset = this.resolveVictoryIfNeeded(game);

    return {
      gameId,
      roomDeleted: false,
      game: this.toSnapshot(gameId, game),
      shouldScheduleReset,
    };
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
      return this.handleWrongAnswer(gameId, game, currentPlayer, "WORD_NOT_IN_DICTIONARY");
    }

    if (!GameRules.startsWithRequiredLetter(normalizedWord, game.requiredLetter)) {
      return this.handleWrongAnswer(gameId, game, currentPlayer, "INVALID_REQUIRED_LETTER");
    }

    if (!GameRules.isNewWord(normalizedWord, game.usedWords)) {
      return this.handleWrongAnswer(gameId, game, currentPlayer, "WORD_ALREADY_USED");
    }

    game.currentWord = normalizedWord;
    game.requiredLetter = GameRules.getNextRequiredLetter(
      normalizedWord,
      game.difficulty,
      (nextWord) => this.dictionaryService.pickRandomLetter(nextWord),
    );
    game.usedWords.add(normalizedWord);
    game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);
    game.remainingTurnSeconds = game.settings.turnTimeSeconds;

    return {
      success: true,
      game: this.toSnapshot(gameId, game),
    };
  }

  resetGameAfterVictory(gameId: string): GameSnapshot | null {
    const game = this.gameStore.findById(gameId);
    if (!game) return null;

    if (game.status !== GameStatus.FINISHED) {
      return this.toSnapshot(gameId, game);
    }

    game.status = GameStatus.WAITING;
    game.winnerPlayerId = null;
    game.currentWord = null;
    game.requiredLetter = null;
    game.remainingTurnSeconds = 0;
    game.currentTurnIndex = 0;
    game.usedWords.clear();

    game.players.forEach((player) => {
      player.isActive = true;
    });

    return this.toSnapshot(gameId, game);
  }

  getAutoResetDelayMs(): number {
    return AUTO_RESET_DELAY_MS;
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

  private handleWrongAnswer(
    gameId: string,
    game: Game,
    player: Player,
    reason: SubmitWordResult["reason"],
  ): SubmitWordResult {
    game.remainingTurnSeconds = Math.max(0, game.remainingTurnSeconds - game.settings.wrongAnswerPenalty);

    if (game.remainingTurnSeconds === 0) {
      player.isActive = false;

      const hasWinner = this.resolveVictoryIfNeeded(game);
      if (!hasWinner) {
        game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);
        game.remainingTurnSeconds = game.settings.turnTimeSeconds;
      }
    }

    return {
      success: false,
      reason,
      game: this.toSnapshot(gameId, game),
    };
  }

  private resolveVictoryIfNeeded(game: Game): boolean {
    const activePlayers = game.getActivePlayers();

    if (activePlayers.length !== 1) {
      return false;
    }

    const winner = activePlayers[0];
    game.status = GameStatus.FINISHED;
    game.winnerPlayerId = winner.id;
    game.remainingTurnSeconds = 0;
    game.currentTurnIndex = Math.max(0, game.players.findIndex((player) => player.id === winner.id));
    return true;
  }

  tickTurn(gameId: string): GameSnapshot | null {
    const game = this.gameStore.findById(gameId);
    if (!game) return null;

    if (game.status !== GameStatus.IN_PROGRESS) {
      return this.toSnapshot(gameId, game);
    }

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isActive) {
      game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);
      game.remainingTurnSeconds = game.settings.turnTimeSeconds;
      return this.toSnapshot(gameId, game);
    }

    game.remainingTurnSeconds = Math.max(0, game.remainingTurnSeconds - 1);

    if (game.remainingTurnSeconds > 0) {
      return this.toSnapshot(gameId, game);
    }

    currentPlayer.isActive = false;
    const hasWinner = this.resolveVictoryIfNeeded(game);

    if (!hasWinner) {
      game.currentTurnIndex = this.turnService.getNextTurnIndex(game.players, game.currentTurnIndex);
      game.remainingTurnSeconds = game.settings.turnTimeSeconds;
    }

    return this.toSnapshot(gameId, game);
  }

  private toSnapshot(gameId: string, game: Game): GameSnapshot {
    const players = game.players.map((player) => this.toPlayerDTO(player));
    const currentPlayer = game.getCurrentPlayer();

    return {
      gameId,
      difficulty: game.difficulty,
      status: game.status,
      currentWord: game.currentWord,
      requiredLetter: game.requiredLetter,
      remainingTurnSeconds: game.remainingTurnSeconds,
      currentTurnIndex: game.currentTurnIndex,
      currentPlayerId: currentPlayer?.id ?? null,
      winnerPlayerId: game.winnerPlayerId,
      settings: {
        turnTimeSeconds: game.settings.turnTimeSeconds,
        wrongAnswerPenalty: game.settings.wrongAnswerPenalty,
        maxPlayersEnabled: game.settings.maxPlayersEnabled,
        maxPlayers: game.settings.maxPlayers,
      },
      players,
    };
  }

  private toPlayerDTO(player: Player): PlayerDTO {
    return {
      id: player.id,
      name: player.name,
      socketId: player.socketId,
      isActive: player.isActive,
      isHost: player.isHost,
    };
  }
}
