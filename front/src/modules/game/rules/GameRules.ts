import type { SubmitWordErrorReason, Difficulty } from "../types/game.types";

export class GameRules {
  static toErrorMessage(reason?: SubmitWordErrorReason): string {
    if (!reason) return "Erro desconhecido";

    const messages: Record<SubmitWordErrorReason, string> = {
      GAME_NOT_FOUND: "Sala não encontrada.",
      NOT_PLAYER_TURN: "Não é sua vez de jogar.",
      WORD_NOT_IN_DICTIONARY: "Palavra não encontrada no dicionário.",
      INVALID_REQUIRED_LETTER: "A palavra não começa com a letra esperada.",
      WORD_ALREADY_USED: "Essa palavra já foi usada.",
    };

    return messages[reason];
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
