import fs from "node:fs";
import path from "node:path";
import { Dataset, Difficulty } from "../../types/game.types";

export class DictionaryService {
  private readonly dictionaries: Dataset;
  private readonly dataPath: string;

  constructor(dataPath: string = path.join(process.cwd(), "data")) {
    this.dataPath = dataPath;
    this.dictionaries = {
      caotic: this.loadDictionary("caotic"),
      normal: this.loadDictionary("normal"),
      easy: this.loadDictionary("easy"),
    };
  }

  isValidWord(word: string, difficulty: Difficulty): boolean {
    return this.dictionaries[difficulty].has(word.toLowerCase());
  }

  pickRandomWord(difficulty: Difficulty): string {
    const words = Array.from(this.dictionaries[difficulty]);

    if (words.length === 0) return "casa";

    return words[Math.floor(Math.random() * words.length)];
  }

  pickRandomLetter(word: string): string {
    const validLetters = "abcdefghijklmnopqrstuvwxyz";

    const filtered = word
      .toLowerCase()
      .split("")
      .filter((char) => validLetters.includes(char));

    if (filtered.length === 0) return "a";

    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  private loadDictionary(difficulty: Difficulty): Set<string> {
    const fileName = this.getDictionaryFileName(difficulty);

    try {
      const words = fs
        .readFileSync(path.join(this.dataPath, fileName), "utf-8")
        .split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean);

      return new Set(words);
    } catch (error) {
      console.error(`Error loading dictionary "${difficulty}":`, error);
      return new Set();
    }
  }

  private getDictionaryFileName(difficulty: Difficulty): string {
    return difficulty === "caotic" || difficulty === "normal"
      ? "accentsMarksWords.txt"
      : "nonAccentsMarksWords.txt";
  }
}
