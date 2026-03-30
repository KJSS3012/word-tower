export type Difficulty = "caotic" | "normal" | "easy";

export type Dataset = Record<Difficulty, Set<string>>;

export enum GameStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  FINISHED = "FINISHED",
}

export type SubmitWordErrorReason =
  | "GAME_NOT_FOUND"
  | "NOT_PLAYER_TURN"
  | "WORD_NOT_IN_DICTIONARY"
  | "INVALID_REQUIRED_LETTER"
  | "WORD_ALREADY_USED";

export interface SubmitWordResult {
  success: boolean;
  reason?: SubmitWordErrorReason;
}

export interface PlayerDTO {
  id: string;
  name: string;
  socketId: string;
  isActive: boolean;
  isHost: boolean;
}