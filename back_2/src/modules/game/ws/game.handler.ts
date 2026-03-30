import { Server, Socket } from "socket.io";
import { GameService } from "../application/GameService";
import { Difficulty } from "../types/game.types";

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

export function registerGameHandlers(io: Server, gameService: GameService): void {
  const handlePlayerExit = (socket: Socket): void => {
    const removeResult = gameService.removePlayerBySocketId(socket.id);
    if (!removeResult) return;

    if (removeResult.roomDeleted) {
      io.to(removeResult.gameId).emit("game:room:closed", {
        gameId: removeResult.gameId,
      });
      return;
    }

    if (removeResult.game) {
      io.to(removeResult.gameId).emit("game:state", { game: removeResult.game });
    }

    if (removeResult.winnerPlayerId) {
      io.to(removeResult.gameId).emit("game:winner", {
        gameId: removeResult.gameId,
        winnerPlayerId: removeResult.winnerPlayerId,
      });
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

      const player = gameService.addPlayer(
        gameId,
        playerName,
        socket.id,
        isHost,
      );

      if (!player) {
        socket.emit("game:join:result", { success: false, reason: "GAME_NOT_FOUND" });
        return;
      }

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
      const result = gameService.startGame(normalizedGameId);
      socket.emit("game:start:result", result);

      if (result.success) {
        io.to(normalizedGameId).emit("game:state", { game: result.game });
      }
    });

    socket.on("game:submit", (payload: SubmitPayload) => {
      const result = gameService.submitWord(payload.gameId, payload.playerId, payload.word);
      socket.emit("game:submit:result", result);

      if (result.success) {
        io.to(payload.gameId).emit("game:state", { game: result.game });
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
