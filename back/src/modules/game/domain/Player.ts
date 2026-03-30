import { randomUUID } from "node:crypto";

export class Player {
  public readonly id: string;
  public name: string;
  public socketId: string;
  public isActive: boolean;
  public isHost: boolean;

  constructor(name: string, socketId: string, isHost: boolean = false) {
    this.id = randomUUID();
    this.name = name;
    this.socketId = socketId;
    this.isActive = true;
    this.isHost = isHost;
  }

  toString(): string {
    return `Player(${this.name}, id: ${this.id.slice(0, 8)}, active: ${this.isActive}, host: ${this.isHost})`;
  }
}
