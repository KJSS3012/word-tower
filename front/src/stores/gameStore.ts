import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { Socket } from "socket.io-client";
import { GameService } from "@/modules/game/application/GameService";
import { TimerService } from "@/modules/game/application/TimerService";
import { TurnService } from "@/modules/game/application/TurnService";
import { GameRules } from "@/modules/game/rules/GameRules";
import { DictionaryService } from "@/modules/game/infrastructure/dictionary/DictionaryService";
import { GameStore as InternalGameStore } from "@/modules/game/infrastructure/store/GameStore";
import { GameHandler } from "@/modules/game/ws/game.handler";
import type { Difficulty, GameMessage, PlayerView } from "@/modules/game/types/game.types";

const gameHandler = new GameHandler();
const internalGameStore = new InternalGameStore();
const dictionaryService = new DictionaryService();
const gameService = new GameService(internalGameStore, dictionaryService, gameHandler);
const turnService = new TurnService();
const timerService = new TimerService();

const GAME_SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL ?? "http://localhost:3000";

export const useGameStore = defineStore("game", () => {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const gameId = ref("");
  const playerName = ref("");

  const players = ref<PlayerView[]>([]);
  const currentWord = ref("");
  const nextLetter = ref("");
  const nextLetterIndex = ref(0);
  const difficulty = ref<string>("normal");
  const gameStarted = ref(false);
  const currentPlayer = ref<PlayerView | null>(null);
  const myPlayerId = ref("");
  const hostId = ref("");

  const roomSettings = ref({
    defaultTime: 30,
    difficulty: "normal",
  });

  const remainingTime = ref(0);
  const timerActive = ref(false);
  const isVictoryState = ref(false);
  const winner = ref("");

  const messages = ref<GameMessage[]>([]);
  const lastError = ref("");

  const isConnected = computed(() => connected.value && socket.value?.disconnected === false);
  const isMyTurn = computed(() => {
    if (!currentPlayer.value || !myPlayerId.value) return false;
    return currentPlayer.value.id === myPlayerId.value;
  });
  const amIHost = computed(() => {
    if (hostId.value && myPlayerId.value) {
      return hostId.value === myPlayerId.value;
    }

    const me = players.value.find((player) => player.id === myPlayerId.value);
    return me?.is_host ?? false;
  });

  function connect(gameIdParam: string, playerNameParam: string): void {
    if (!gameIdParam.trim() || !playerNameParam.trim()) return;

    if (socket.value) {
      gameService.disconnect();
    }

    gameId.value = gameIdParam.trim();
    playerName.value = playerNameParam.trim();
    localStorage.removeItem("pendingPlayerName");

    const initialDifficulty: Difficulty = GameRules.displayDifficultyToCode(roomSettings.value.difficulty);

    gameService.connect(
      GAME_SERVER_URL,
      gameId.value,
      playerName.value,
      initialDifficulty,
      {
        onConnected: () => {
          connected.value = true;
          socket.value = gameService.getSocket();
          addMessage("Sistema", "Conectado ao servidor.");
        },
        onDisconnected: () => {
          connected.value = false;
          stopTimer();
          addMessage("Sistema", "Conexao encerrada.");
        },
        onState: (state) => {
          players.value = state.players;
          currentWord.value = state.currentWord;
          nextLetter.value = state.nextLetter;
          nextLetterIndex.value = state.nextLetterIndex;
          difficulty.value = state.difficulty;
          gameStarted.value = state.gameStarted;
          currentPlayer.value = turnService.findCurrentPlayer(
            state.players,
            state.currentPlayer?.id ?? null,
          );

          updateHostInfo();

          if (state.winnerPlayerId) {
            isVictoryState.value = true;
            winner.value = state.winnerPlayerName;
          } else {
            isVictoryState.value = false;
            winner.value = "";
          }

          if (gameStarted.value) {
            restartTurnTimer();
          } else {
            stopTimer();
          }
        },
        onJoin: (result) => {
          if (!result.success || !result.player) {
            const reason = result.reason || "Falha ao entrar na sala.";
            setError(reason);
            return;
          }

          myPlayerId.value = result.player.id;
          addMessage("Sistema", `${result.player.name} entrou na sala.`);
        },
        onStart: (result) => {
          if (!result.success) {
            setError(result.reason || "Nao foi possivel iniciar o jogo.");
            return;
          }

          addMessage("Sistema", "Jogo iniciado.");
        },
        onSubmit: (result) => {
          if (!result.success) {
            setError(GameRules.toErrorMessage(result.reason));
            return;
          }

          addMessage("Sistema", "Jogada aceita.");
        },
        onError: (message) => {
          setError(message);
        },
      },
    );
  }

  function submitWord(word: string): void {
    const normalized = word.trim();
    if (!normalized || !myPlayerId.value) return;

    gameService.submitWord(gameId.value, myPlayerId.value, normalized);
  }

  function startNewGame(): void {
    if (!gameId.value) return;
    gameService.startGame(gameId.value);
  }

  function changeDifficulty(newDifficulty: string): void {
    roomSettings.value.difficulty = newDifficulty;
    difficulty.value = GameRules.displayDifficultyToCode(newDifficulty);
    addMessage("Sistema", `Dificuldade local definida para ${newDifficulty}.`);
  }

  function updateRoomSettings(settings: { defaultTime?: number; difficulty?: string }): void {
    if (typeof settings.defaultTime === "number") {
      roomSettings.value.defaultTime = settings.defaultTime;
    }

    if (typeof settings.difficulty === "string") {
      roomSettings.value.difficulty = settings.difficulty;
      difficulty.value = GameRules.displayDifficultyToCode(settings.difficulty);
    }

    addMessage("Sistema", "Configuracoes aplicadas localmente.");

    if (gameStarted.value) {
      restartTurnTimer();
    }
  }

  function leaveGame(): void {
    gameService.leaveGame();
    gameService.disconnect();
    resetState();
  }

  function resetState(): void {
    connected.value = false;
    gameId.value = "";
    playerName.value = "";
    players.value = [];
    currentWord.value = "";
    nextLetter.value = "";
    nextLetterIndex.value = 0;
    difficulty.value = "normal";
    gameStarted.value = false;
    currentPlayer.value = null;
    myPlayerId.value = "";
    hostId.value = "";
    messages.value = [];
    lastError.value = "";
    isVictoryState.value = false;
    winner.value = "";
    roomSettings.value = {
      defaultTime: 30,
      difficulty: "normal",
    };
    stopTimer();
    socket.value = null;
  }

  function addMessage(sender: string, content: string): void {
    messages.value.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      sender,
      content,
      timestamp: new Date().toLocaleTimeString(),
    });
  }

  function clearError(): void {
    lastError.value = "";
  }

  function setError(message: string): void {
    lastError.value = message;
    addMessage("Erro", message);
  }

  function updateHostInfo(): void {
    const hostPlayer = players.value.find((player) => player.is_host);
    hostId.value = hostPlayer?.id ?? "";
  }

  function restartTurnTimer(): void {
    timerActive.value = true;
    timerService.start(
      roomSettings.value.defaultTime,
      (remaining) => {
        remainingTime.value = remaining;
      },
      () => {
        timerActive.value = false;
      },
    );
  }

  function stopTimer(): void {
    timerService.stop();
    timerActive.value = false;
    remainingTime.value = 0;
  }

  return {
    socket,
    connected,
    gameId,
    playerName,
    players,
    currentWord,
    nextLetter,
    nextLetterIndex,
    difficulty,
    gameStarted,
    currentPlayer,
    myPlayerId,
    hostId,
    messages,
    lastError,
    roomSettings,
    remainingTime,
    timerActive,
    isVictoryState,
    winner,
    isConnected,
    isMyTurn,
    amIHost,
    connect,
    submitWord,
    startNewGame,
    changeDifficulty,
    leaveGame,
    resetState,
    addMessage,
    clearError,
    updateRoomSettings,
  };
});
