import { io, Socket } from "socket.io-client";
import type { JoinPayload, SubmitPayload } from "../types/game.types";

export class GameHandler {
  private socket: Socket | null = null;

  connect(serverUrl: string): Socket {
    this.disconnect();

    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emitJoin(payload: JoinPayload): void {
    this.socket?.emit("game:join", payload);
  }

  emitStart(gameId: string): void {
    this.socket?.emit("game:start", gameId);
  }

  emitSubmit(payload: SubmitPayload): void {
    this.socket?.emit("game:submit", payload);
  }

  emitLeave(): void {
    this.socket?.emit("game:leave");
  }

  disconnect(): void {
    if (!this.socket) return;

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }
}
