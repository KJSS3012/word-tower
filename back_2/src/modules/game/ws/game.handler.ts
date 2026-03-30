import { Server, Socket } from "socket.io";
import { GameService } from "../application/GameService";

interface JoinPayload {
  gameId: string;
  name: string;
  isHost?: boolean;
}

interface SubmitPayload {
  gameId: string;
  playerId: string;
  word: string;
}

export function registerGameHandlers(io: Server, gameService: GameService): void {
  io.on("connection", (socket: Socket) => {
    socket.on("game:join", (payload: JoinPayload) => {
      const player = gameService.addPlayer(
        payload.gameId,
        payload.name,
        socket.id,
        payload.isHost ?? false,
      );

      socket.emit("game:join:result", { success: Boolean(player), player });
    });

    socket.on("game:start", (gameId: string) => {
      const success = gameService.startGame(gameId);
      socket.emit("game:start:result", { success });
    });

    socket.on("game:submit", (payload: SubmitPayload) => {
      const result = gameService.submitWord(payload.gameId, payload.playerId, payload.word);
      socket.emit("game:submit:result", result);
    });
  });
}
