import type { Difficulty } from "../../types/game.types";

export class DictionaryService {
  resolveRequiredLetterIndex(word: string, requiredLetter: string, difficulty: Difficulty): number {
    if (!word || !requiredLetter) return -1;

    const normalizedWord = word.toLowerCase();
    const normalizedLetter = requiredLetter.toLowerCase();

    if (difficulty === "caotic") {
      return normalizedWord.indexOf(normalizedLetter);
    }

    return normalizedWord.length - 1;
  }
}
