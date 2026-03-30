import type { SubmitWordErrorReason, Difficulty } from "../types/game.types";

export class GameRules {
  private static readonly reasonMessages: Record<string, string> = {
    GAME_NOT_FOUND: "Sala não encontrada.",
    ROOM_FULL: "A sala está lotada. Escolha outra sala.",
    INVALID_PAYLOAD: "Dados inválidos para entrar na sala.",
    NOT_ENOUGH_PLAYERS: "São necessários pelo menos 2 jogadores para iniciar a partida.",
    ONLY_HOST_CAN_UPDATE_SETTINGS: "Apenas o host pode alterar as configurações da sala.",
    CANNOT_CHANGE_DIFFICULTY_DURING_GAME: "Não é possível alterar a dificuldade durante a partida.",
    MAX_PLAYERS_LOWER_THAN_CURRENT_PLAYERS: "O limite de jogadores não pode ser menor que o total atual na sala.",
    NOT_PLAYER_TURN: "Não é sua vez de jogar.",
    WORD_NOT_IN_DICTIONARY: "Palavra não encontrada no dicionário.",
    INVALID_REQUIRED_LETTER: "A palavra não começa com a letra esperada.",
    WORD_ALREADY_USED: "Essa palavra já foi usada.",
  };

  private static readonly lobbyRedirectReasons = new Set<string>([
    "ROOM_FULL",
    "GAME_NOT_FOUND",
    "INVALID_PAYLOAD",
    "ROOM_CLOSED",
  ]);

  static toErrorMessage(reason?: SubmitWordErrorReason): string {
    if (!reason) return "Erro desconhecido";

    return this.reasonMessages[reason] ?? "Erro desconhecido";
  }

  static toJoinErrorMessage(reason?: string): string {
    if (!reason) return "Falha ao entrar na sala.";
    return this.reasonMessages[reason] ?? "Falha ao entrar na sala.";
  }

  static toStartErrorMessage(reason?: string): string {
    if (!reason) return "Não foi possível iniciar o jogo.";

    const normalizedReason = reason.toLowerCase();
    if (normalizedReason.includes("pelo menos 2") || normalizedReason.includes("2 jogadores")) {
      return this.reasonMessages.NOT_ENOUGH_PLAYERS;
    }

    return this.reasonMessages[reason] ?? reason;
  }

  static toSettingsErrorMessage(reason?: string): string {
    if (!reason) return "Não foi possível atualizar as configurações.";
    return this.reasonMessages[reason] ?? "Não foi possível atualizar as configurações.";
  }

  static shouldRedirectToLobbyOnError(reason?: string): boolean {
    if (!reason) return false;
    return this.lobbyRedirectReasons.has(reason);
  }

  static displayDifficultyToCode(value: string): Difficulty {
    const normalized = value.toLowerCase();

    if (normalized === "fácil" || normalized === "facil" || normalized === "easy") {
      return "easy";
    }

    if (normalized === "difícil" || normalized === "dificil" || normalized === "caotic") {
      return "caotic";
    }

    return "normal";
  }
}
