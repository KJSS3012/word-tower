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

export interface PlayerDTO {
  id: string;
  name: string;
  socketId: string;
  isActive: boolean;
  isHost: boolean;
}

export interface GameSnapshot {
  gameId: string;
  difficulty: Difficulty;
  status: GameStatus;
  currentWord: string | null;
  requiredLetter: string | null;
  currentTurnIndex: number;
  currentPlayerId: string | null;
  winnerPlayerId: string | null;
  players: PlayerDTO[];
}

export interface JoinGameResult {
  success: boolean;
  player?: PlayerDTO;
  game?: GameSnapshot;
  reason?: string;
}

export interface StartGameResult {
  success: boolean;
  game?: GameSnapshot;
  reason?: string;
}

export interface SubmitWordResult {
  success: boolean;
  reason?: SubmitWordErrorReason;
  game?: GameSnapshot;
}