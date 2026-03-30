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
} from "../types/game.types";
import { DictionaryService } from "../infrastructure/dictionary/DictionaryService";
import { GameStore } from "../infrastructure/store/GameStore";
import { TurnService } from "./TurnService";

interface RemovePlayerResult {
  gameId: string;
  roomDeleted: boolean;
  game?: GameSnapshot;
  winnerPlayerId?: string;
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

  addPlayer(gameId: string, name: string, socketId: string, isHost: boolean = false): Player | null {
    const game = this.gameStore.findById(gameId);
    if (!game) return null;

    const player = new Player(name, socketId, isHost);
    game.addPlayer(player);
    return player;
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

    if (game.players.length === 1) {
      const winner = game.players[0];
      winner.isActive = true;
      game.status = GameStatus.FINISHED;
      game.winnerPlayerId = winner.id;
      game.currentTurnIndex = 0;

      return {
        gameId,
        roomDeleted: false,
        game: this.toSnapshot(gameId, game),
        winnerPlayerId: winner.id,
      };
    }

    if (game.status === GameStatus.FINISHED) {
      game.status = GameStatus.WAITING;
      game.winnerPlayerId = null;
    }

    return {
      gameId,
      roomDeleted: false,
      game: this.toSnapshot(gameId, game),
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

    return {
      success: true,
      game: this.toSnapshot(gameId, game),
    };
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

  private toSnapshot(gameId: string, game: Game): GameSnapshot {
    const players = game.players.map((player) => this.toPlayerDTO(player));
    const currentPlayer = game.getCurrentPlayer();

    return {
      gameId,
      difficulty: game.difficulty,
      status: game.status,
      currentWord: game.currentWord,
      requiredLetter: game.requiredLetter,
      currentTurnIndex: game.currentTurnIndex,
      currentPlayerId: currentPlayer?.id ?? null,
      winnerPlayerId: game.winnerPlayerId,
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
