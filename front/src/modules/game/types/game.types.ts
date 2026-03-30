export type Difficulty = "caotic" | "normal" | "easy";

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

export interface GameSettings {
  turnTimeSeconds: number;
  wrongAnswerPenalty: number;
  maxPlayersEnabled: boolean;
  maxPlayers: number;
}

export interface GameSnapshot {
  gameId: string;
  difficulty: Difficulty;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  currentWord: string | null;
  requiredLetter: string | null;
  remainingTurnSeconds: number;
  currentTurnIndex: number;
  currentPlayerId: string | null;
  winnerPlayerId: string | null;
  settings: GameSettings;
  players: PlayerDTO[];
}

export interface JoinPayload {
  gameId: string;
  name: string;
  isHost?: boolean;
  difficulty?: Difficulty;
}

export interface SubmitPayload {
  gameId: string;
  playerId: string;
  word: string;
}

export interface JoinResult {
  success: boolean;
  player?: PlayerDTO;
  game?: GameSnapshot | null;
  reason?: string;
}

export interface StartResult {
  success: boolean;
  game?: GameSnapshot | null;
  reason?: string;
}

export interface SubmitResult {
  success: boolean;
  reason?: SubmitWordErrorReason;
  game?: GameSnapshot | null;
}

export interface UpdateSettingsPayload {
  turnTimeSeconds?: number;
  difficulty?: Difficulty;
  wrongAnswerPenalty?: number;
  maxPlayersEnabled?: boolean;
  maxPlayers?: number;
}

export interface UpdateSettingsResult {
  success: boolean;
  reason?: string;
  game?: GameSnapshot | null;
}

export interface PlayerView {
  id: string;
  name: string;
  socket_id: string;
  is_active: boolean;
  is_host: boolean;
}

export interface GameMessage {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
}

export interface RoomSettings {
  turnTimeSeconds: number;
  difficulty: Difficulty;
  wrongAnswerPenalty: number;
  maxPlayersEnabled: boolean;
  maxPlayers: number;
}

export interface FrontGameState {
  gameId: string;
  difficulty: Difficulty;
  gameStarted: boolean;
  players: PlayerView[];
  currentWord: string;
  nextLetter: string;
  nextLetterIndex: number;
  remainingTurnSeconds: number;
  currentPlayer: PlayerView | null;
  winnerPlayerId: string | null;
  winnerPlayerName: string;
  settings: RoomSettings;
}
