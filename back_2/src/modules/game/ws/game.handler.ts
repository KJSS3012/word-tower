import { Server, Socket } from "socket.io";
import { GameService } from "../application/GameService";
import { Difficulty, UpdateSettingsPayload } from "../types/game.types";

interface JoinPayload {
  gameId: string;
  name: string;
  isHost?: boolean;
  difficulty?: Difficulty;
}

interface SubmitPayload {
  gameId: string;
  playerId: string;
  word: string;
}

interface UpdateSettingsWsPayload {
  gameId: string;
  settings: UpdateSettingsPayload;
}

export function registerGameHandlers(io: Server, gameService: GameService): void {
  const resetTimers = new Map<string, NodeJS.Timeout>();
  const turnTickers = new Map<string, NodeJS.Timeout>();

  const stopTurnTicker = (gameId: string): void => {
    const ticker = turnTickers.get(gameId);
    if (!ticker) return;

    clearInterval(ticker);
    turnTickers.delete(gameId);
  };

  const ensureTurnTicker = (gameId: string): void => {
    if (turnTickers.has(gameId)) return;

    const ticker = setInterval(() => {
      const snapshot = gameService.tickTurn(gameId);
      if (!snapshot) {
        stopTurnTicker(gameId);
        return;
      }

      io.to(gameId).emit("game:state", { game: snapshot });

      if (snapshot.status === "FINISHED") {
        stopTurnTicker(gameId);
        scheduleRoomReset(gameId);
      }

      if (snapshot.status === "WAITING") {
        stopTurnTicker(gameId);
      }
    }, 1000);

    turnTickers.set(gameId, ticker);
  };

  const scheduleRoomReset = (gameId: string): void => {
    const existingTimer = resetTimers.get(gameId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timeout = setTimeout(() => {
      resetTimers.delete(gameId);
      const resetSnapshot = gameService.resetGameAfterVictory(gameId);
      if (resetSnapshot) {
        io.to(gameId).emit("game:state", { game: resetSnapshot });
        if (resetSnapshot.status === "IN_PROGRESS") {
          ensureTurnTicker(gameId);
        } else {
          stopTurnTicker(gameId);
        }
      }
    }, gameService.getAutoResetDelayMs());

    resetTimers.set(gameId, timeout);
  };

  const handlePlayerExit = (socket: Socket): void => {
    const removeResult = gameService.removePlayerBySocketId(socket.id);
    if (!removeResult) return;

    const existingTimer = resetTimers.get(removeResult.gameId);
    if (removeResult.roomDeleted && existingTimer) {
      clearTimeout(existingTimer);
      resetTimers.delete(removeResult.gameId);
    }

    if (removeResult.roomDeleted) {
      stopTurnTicker(removeResult.gameId);
    }

    if (removeResult.roomDeleted) {
      io.to(removeResult.gameId).emit("game:room:closed", {
        gameId: removeResult.gameId,
      });
      return;
    }

    if (removeResult.game) {
      io.to(removeResult.gameId).emit("game:state", { game: removeResult.game });

      if (removeResult.game.status === "IN_PROGRESS") {
        ensureTurnTicker(removeResult.gameId);
      } else {
        stopTurnTicker(removeResult.gameId);
      }
    }

    if (removeResult.shouldScheduleReset) {
      scheduleRoomReset(removeResult.gameId);
    }
  };

  io.on("connection", (socket: Socket) => {
    socket.on("game:join", (payload: JoinPayload) => {
      const gameId = payload.gameId.trim();
      const playerName = payload.name.trim();

      if (!gameId || !playerName) {
        socket.emit("game:join:result", { success: false, reason: "INVALID_PAYLOAD" });
        return;
      }

      let game = gameService.getGame(gameId);
      if (!game) {
        game = gameService.createGame(gameId, payload.difficulty ?? "normal");
      }

      const isHost = game.players.length === 0 ? true : Boolean(payload.isHost);

      const addResult = gameService.addPlayer(
        gameId,
        playerName,
        socket.id,
        isHost,
      );

      if (!addResult.player) {
        socket.emit("game:join:result", { success: false, reason: addResult.reason ?? "GAME_NOT_FOUND" });
        return;
      }

      const player = addResult.player;

      socket.join(gameId);

      const gameSnapshot = gameService.getGameSnapshot(gameId);
      socket.emit("game:join:result", {
        success: true,
        player: {
          id: player.id,
          name: player.name,
          socketId: player.socketId,
          isActive: player.isActive,
          isHost: player.isHost,
        },
        game: gameSnapshot,
      });

      io.to(gameId).emit("game:state", { game: gameSnapshot });
    });

    socket.on("game:start", (gameId: string) => {
      const normalizedGameId = gameId.trim();
      const existingTimer = resetTimers.get(normalizedGameId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        resetTimers.delete(normalizedGameId);
      }

      stopTurnTicker(normalizedGameId);

      const result = gameService.startGame(normalizedGameId);
      socket.emit("game:start:result", result);

      if (result.success) {
        io.to(normalizedGameId).emit("game:state", { game: result.game });
        ensureTurnTicker(normalizedGameId);
      }
    });

    socket.on("game:submit", (payload: SubmitPayload) => {
      const result = gameService.submitWord(payload.gameId, payload.playerId, payload.word);
      socket.emit("game:submit:result", result);

      if (result.game) {
        io.to(payload.gameId).emit("game:state", { game: result.game });

        if (result.game.status === "FINISHED") {
          stopTurnTicker(payload.gameId);
          scheduleRoomReset(payload.gameId);
        } else if (result.game.status === "IN_PROGRESS") {
          ensureTurnTicker(payload.gameId);
        }
      }
    });

    socket.on("game:settings:update", (payload: UpdateSettingsWsPayload) => {
      const gameId = payload.gameId.trim();
      const result = gameService.updateSettings(gameId, socket.id, payload.settings);
      socket.emit("game:settings:result", result);

      if (result.success && result.game) {
        io.to(gameId).emit("game:state", { game: result.game });

        if (result.game.status === "IN_PROGRESS") {
          ensureTurnTicker(gameId);
        }
      }
    });

    socket.on("game:leave", () => {
      handlePlayerExit(socket);
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      handlePlayerExit(socket);
    });
  });
}
