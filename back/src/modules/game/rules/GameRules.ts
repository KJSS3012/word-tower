import { Player } from "../domain/Player";
import { Difficulty } from "../types/game.types";

export class GameRules {
  static normalizeWord(word: string): string {
    return word.trim().toLowerCase();
  }

  static startsWithRequiredLetter(word: string, requiredLetter: string | null): boolean {
    if (!requiredLetter) return true;
    return this.normalizeWord(word).startsWith(requiredLetter.toLowerCase());
  }

  static isNewWord(word: string, usedWords: Set<string>): boolean {
    return !usedWords.has(this.normalizeWord(word));
  }

  static getNextRequiredLetter(
    word: string,
    difficulty: Difficulty,
    pickRandomLetter: (word: string) => string,
  ): string {
    const normalizedWord = this.normalizeWord(word);

    if (!normalizedWord) return "a";

    if (difficulty === "caotic") {
      return pickRandomLetter(normalizedWord);
    }

    return normalizedWord[normalizedWord.length - 1];
  }

  static hasWinner(players: Player[]): boolean {
    return players.filter((player) => player.isActive).length <= 1;
  }
}
