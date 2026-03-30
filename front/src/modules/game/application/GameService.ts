import { Socket } from "socket.io-client";
import { Game } from "../domain/Game";
import { DictionaryService } from "../infrastructure/dictionary/DictionaryService";
import { GameStore } from "../infrastructure/store/GameStore";
import { GameHandler } from "../ws/game.handler";
import type {
  Difficulty,
  FrontGameState,
  JoinPayload,
  JoinResult,
  StartResult,
  SubmitPayload,
  SubmitResult,
  UpdateSettingsPayload,
  UpdateSettingsResult,
} from "../types/game.types";

interface GameServiceCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onState: (state: FrontGameState) => void;
  onJoin: (result: JoinResult) => void;
  onStart: (result: StartResult) => void;
  onSubmit: (result: SubmitResult) => void;
  onSettingsUpdated: (result: UpdateSettingsResult) => void;
  onRoomClosed: () => void;
  onError: (message: string) => void;
}

export class GameService {
  constructor(
    private readonly gameStore: GameStore,
    private readonly dictionaryService: DictionaryService,
    private readonly gameHandler: GameHandler,
  ) { }

  connect(
    serverUrl: string,
    gameId: string,
    playerName: string,
    difficulty: Difficulty,
    callbacks: GameServiceCallbacks,
  ): void {
    const socket = this.gameHandler.connect(serverUrl);

    socket.on("connect", () => {
      callbacks.onConnected();
      const payload: JoinPayload = {
        gameId,
        name: playerName,
        difficulty,
      };
      this.gameHandler.emitJoin(payload);
    });

    socket.on("disconnect", () => {
      callbacks.onDisconnected();
    });

    socket.on("connect_error", () => {
      callbacks.onError("Erro ao conectar no servidor.");
    });

    socket.on("game:join:result", (result: JoinResult) => {
      callbacks.onJoin(result);
      if (result.game) {
        this.applySnapshot(result.game, callbacks.onState);
      }
    });

    socket.on("game:state", (payload: { game: JoinResult["game"] }) => {
      if (!payload.game) return;
      this.applySnapshot(payload.game, callbacks.onState);
    });

    socket.on("game:start:result", (result: StartResult) => {
      callbacks.onStart(result);
      if (result.game) {
        this.applySnapshot(result.game, callbacks.onState);
      }
    });

    socket.on("game:submit:result", (result: SubmitResult) => {
      callbacks.onSubmit(result);
      if (result.game) {
        this.applySnapshot(result.game, callbacks.onState);
      }
    });

    socket.on("game:settings:result", (result: UpdateSettingsResult) => {
      callbacks.onSettingsUpdated(result);
      if (result.game) {
        this.applySnapshot(result.game, callbacks.onState);
      }
    });

    socket.on("game:room:closed", () => {
      callbacks.onRoomClosed();
    });
  }

  startGame(gameId: string): void {
    this.gameHandler.emitStart(gameId);
  }

  submitWord(gameId: string, playerId: string, word: string): void {
    const payload: SubmitPayload = {
      gameId,
      playerId,
      word,
    };
    this.gameHandler.emitSubmit(payload);
  }

  updateSettings(gameId: string, settings: UpdateSettingsPayload): void {
    this.gameHandler.emitSettingsUpdate(gameId, settings);
  }

  leaveGame(): void {
    this.gameHandler.emitLeave();
  }

  disconnect(): void {
    this.gameHandler.disconnect();
    this.gameStore.clear();
  }

  getSocket(): Socket | null {
    return this.gameHandler.getSocket();
  }

  private applySnapshot(snapshot: NonNullable<JoinResult["game"]>, onState: (state: FrontGameState) => void): void {
    this.gameStore.set(snapshot);
    onState(Game.toFrontState(snapshot, this.dictionaryService));
  }
}
