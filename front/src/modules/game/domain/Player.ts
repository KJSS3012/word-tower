import type { PlayerDTO, PlayerView } from "../types/game.types";

export class Player {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly socketId: string,
    public readonly isActive: boolean,
    public readonly isHost: boolean,
  ) { }

  static fromDTO(dto: PlayerDTO): Player {
    return new Player(dto.id, dto.name, dto.socketId, dto.isActive, dto.isHost);
  }

  toView(): PlayerView {
    return {
      id: this.id,
      name: this.name,
      socket_id: this.socketId,
      is_active: this.isActive,
      is_host: this.isHost,
    };
  }
}
