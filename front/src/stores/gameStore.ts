import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { Socket } from "socket.io-client";
import { GameService } from "@/modules/game/application/GameService";
import { TurnService } from "@/modules/game/application/TurnService";
import { GameRules } from "@/modules/game/rules/GameRules";
import { DictionaryService } from "@/modules/game/infrastructure/dictionary/DictionaryService";
import { GameStore as InternalGameStore } from "@/modules/game/infrastructure/store/GameStore";
import { GameHandler } from "@/modules/game/ws/game.handler";
import type { Difficulty, GameMessage, PlayerView, RoomSettings } from "@/modules/game/types/game.types";

const gameHandler = new GameHandler();
const internalGameStore = new InternalGameStore();
const dictionaryService = new DictionaryService();
const gameService = new GameService(internalGameStore, dictionaryService, gameHandler);
const turnService = new TurnService();

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

  const roomSettings = ref<RoomSettings>({
    turnTimeSeconds: 30,
    difficulty: "normal",
    wrongAnswerPenalty: 5,
    maxPlayersEnabled: false,
    maxPlayers: 8,
  });

  const remainingTime = ref(0);
  const timerActive = ref(false);
  const isVictoryState = ref(false);
  const winner = ref("");

  const messages = ref<GameMessage[]>([]);
  const lastError = ref("");
  const lastErrorCode = ref("");

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

    const initialDifficulty: Difficulty = roomSettings.value.difficulty;

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
          roomSettings.value = {
            turnTimeSeconds: state.settings.turnTimeSeconds,
            difficulty: state.settings.difficulty,
            wrongAnswerPenalty: state.settings.wrongAnswerPenalty,
            maxPlayersEnabled: state.settings.maxPlayersEnabled,
            maxPlayers: state.settings.maxPlayers,
          };
          gameStarted.value = state.gameStarted;
          remainingTime.value = state.remainingTurnSeconds;
          timerActive.value = state.gameStarted;
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

          if (!gameStarted.value) {
            stopTimer();
          }
        },
        onJoin: (result) => {
          if (!result.success || !result.player) {
            const reason = result.reason || "Falha ao entrar na sala.";
            setError(GameRules.toJoinErrorMessage(reason), reason);
            return;
          }

          myPlayerId.value = result.player.id;
          addMessage("Sistema", `${result.player.name} entrou na sala.`);
        },
        onStart: (result) => {
          if (!result.success) {
            setError(GameRules.toStartErrorMessage(result.reason), result.reason);
            return;
          }

          addMessage("Sistema", "Jogo iniciado.");
        },
        onSubmit: (result) => {
          if (!result.success) {
            setError(GameRules.toErrorMessage(result.reason), result.reason);
            return;
          }

          addMessage("Sistema", "Jogada aceita.");
        },
        onSettingsUpdated: (result) => {
          if (!result.success) {
            setError(GameRules.toSettingsErrorMessage(result.reason), result.reason);
            return;
          }

          addMessage("Sistema", "Configuracoes da sala atualizadas.");
        },
        onRoomClosed: () => {
          setError("A sala foi encerrada.", "ROOM_CLOSED");
          connected.value = false;
          gameService.disconnect();
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
    updateRoomSettings({
      difficulty: GameRules.displayDifficultyToCode(newDifficulty),
    });
  }

  function updateRoomSettings(settings: Partial<RoomSettings>): void {
    if (!gameId.value || !connected.value) {
      setError("Conecte-se a uma sala antes de alterar configuracoes.");
      return;
    }

    if (!amIHost.value) {
      setError("Apenas o host pode alterar as configuracoes da sala.");
      return;
    }

    gameService.updateSettings(gameId.value, settings);
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
    lastErrorCode.value = "";
    isVictoryState.value = false;
    winner.value = "";
    roomSettings.value = {
      turnTimeSeconds: 30,
      difficulty: "normal",
      wrongAnswerPenalty: 5,
      maxPlayersEnabled: false,
      maxPlayers: 8,
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
    lastErrorCode.value = "";
  }

  function setError(message: string, code?: string): void {
    lastError.value = message;
    lastErrorCode.value = code ?? "";
    addMessage("Erro", message);
  }

  function updateHostInfo(): void {
    const hostPlayer = players.value.find((player) => player.is_host);
    hostId.value = hostPlayer?.id ?? "";
  }

  function stopTimer(): void {
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
    lastErrorCode,
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
