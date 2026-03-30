<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { GameRules } from '@/modules/game/rules/GameRules'
import GenericModal from '@/components/Modal/GenericModal.vue'
import GenericSlider from '@/components/Slider/GenericSlider.vue'
import GenericSwitch from '@/components/Inputs/GenericSwitch.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

// Pegar parâmetros da rota
const gameId = route.params.gameId as string
const playerName = ref(localStorage.getItem('pendingPlayerName') || '')

// Estado local da interface
const inputWord = ref('')
const showNameInput = ref(!playerName.value) // Só mostra se não tem nome salvo
const messagesContainer = ref<HTMLElement | null>(null)
const wordInput = ref<HTMLInputElement | null>(null)
const showGameSettings = ref(false)

// Configurações do jogo (para o modal)
const gameTimeIndex = ref(3) // padrão 30s (índice 3 no array timeOptions)
const timeOptions = ['10s', '15s', '20s', '30s', '45s', '60s']
const difficultyIndex = ref(1) // padrão normal
const difficultyOptions = ['Fácil', 'Normal', 'Caótico']
const wrongPenaltyIndex = ref(4) // padrão 5
const wrongPenaltyOptions = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s']
const maxPlayersEnabled = ref(false)
const maxPlayersIndex = ref(6) // padrão 8
const maxPlayersOptions = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// Computed properties
const canSubmitWord = computed(() =>
  gameStore.isConnected &&
  gameStore.gameStarted &&
  inputWord.value.trim()
)

// Função para conectar após inserir o nome
function connectToGame() {
  if (!playerName.value.trim()) return

  gameStore.connect(gameId, playerName.value.trim())
  showNameInput.value = false
}

// Função para enviar palavra
function submitWord() {
  if (!canSubmitWord.value) return

  gameStore.submitWord(inputWord.value)
  inputWord.value = ''
}

// Função para iniciar jogo
function startGame() {
  gameStore.startNewGame()
}

// Função para voltar ao lobby
function backToLobby() {
  gameStore.leaveGame()
  router.push('/')
}

function redirectToLobbyWithError(message: string) {
  const lobbyMessage = message || 'Não foi possível entrar na sala.'
  localStorage.removeItem('pendingPlayerName')
  gameStore.leaveGame()
  router.push({
    name: 'start-screen',
    query: {
      error: lobbyMessage,
    },
  })
}

// Função para abrir configurações no jogo
function openGameSettings() {
  // Sincronizar com as configurações atuais da sala
  const timeIndex = timeOptions.findIndex((value) => Number.parseInt(value.replace('s', '')) === gameStore.roomSettings.turnTimeSeconds)
  gameTimeIndex.value = timeIndex >= 0 ? timeIndex : 3

  if (gameStore.roomSettings.difficulty === 'easy') difficultyIndex.value = 0
  else if (gameStore.roomSettings.difficulty === 'normal') difficultyIndex.value = 1
  else difficultyIndex.value = 2

  const penaltyIndex = wrongPenaltyOptions.findIndex((value) => Number.parseInt(value.replace('s', '')) === gameStore.roomSettings.wrongAnswerPenalty)
  wrongPenaltyIndex.value = penaltyIndex >= 0 ? penaltyIndex : 4

  maxPlayersEnabled.value = gameStore.roomSettings.maxPlayersEnabled
  const maxIndex = maxPlayersOptions.findIndex((value) => Number.parseInt(value) === gameStore.roomSettings.maxPlayers)
  maxPlayersIndex.value = maxIndex >= 0 ? maxIndex : 6

  showGameSettings.value = true
}

// Função para salvar configurações do jogo
function saveGameSettings() {
  const selectedTimeString = timeOptions[gameTimeIndex.value]
  const selectedTime = parseInt(selectedTimeString.replace('s', ''))
  const difficultyMap = ['easy', 'normal', 'caotic'] as const
  const selectedDifficulty = difficultyMap[difficultyIndex.value] ?? 'normal'
  const selectedPenalty = parseInt(wrongPenaltyOptions[wrongPenaltyIndex.value].replace('s', ''), 10)
  const selectedMaxPlayers = parseInt(maxPlayersOptions[maxPlayersIndex.value], 10)

  gameStore.updateRoomSettings({
    turnTimeSeconds: selectedTime,
    difficulty: selectedDifficulty,
    wrongAnswerPenalty: selectedPenalty,
    maxPlayersEnabled: maxPlayersEnabled.value,
    maxPlayers: selectedMaxPlayers,
  })

  showGameSettings.value = false
}

// Limpar erro
function clearError() {
  gameStore.clearError()
}

// Auto-dismiss do erro após 5 segundos
watch(() => gameStore.lastError, (newError) => {
  if (newError) {
    setTimeout(() => {
      gameStore.clearError()
    }, 5000) // 5 segundos
  }
})

watch(() => gameStore.lastErrorCode, (errorCode) => {
  if (!GameRules.shouldRedirectToLobbyOnError(errorCode)) return
  redirectToLobbyWithError(gameStore.lastError)
})

// Lifecycle
onMounted(() => {
  // Limpar estado ao montar
  gameStore.resetState()

  // Se não tem gameId, volta para o lobby
  if (!gameId) {
    router.push('/')
    return
  }

  // Se já tem nome do jogador, conecta automaticamente
  if (playerName.value.trim()) {
    connectToGame()
  }
})

onUnmounted(() => {
  // Desconectar ao desmontar
  if (gameStore.isConnected) {
    gameStore.leaveGame()
  }
})

// Função para destacar a próxima letra
function highlightNextLetter(word: string, index: number): string {
  if (!word || index < 0 || index >= word.length) return word

  return word.split('').map((char, i) =>
    i === index ? `<mark style="background: #FFB107; color: #8A480F; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${char}</mark>` : char
  ).join('')
}

// Função para fazer scroll para o final das mensagens
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Watch para fazer scroll quando as mensagens mudarem
watch(() => gameStore.messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// Watch para dar foco no input quando for minha vez
watch(() => gameStore.isMyTurn, (isMyTurn) => {
  if (isMyTurn && gameStore.gameStarted && wordInput.value) {
    nextTick(() => {
      wordInput.value?.focus()
    })
  }
})

// Watch para dar foco quando o jogo começar se já for minha vez
watch(() => gameStore.gameStarted, (gameStarted) => {
  if (gameStarted && gameStore.isMyTurn && wordInput.value) {
    nextTick(() => {
      wordInput.value?.focus()
    })
  }
})

// Função para permitir apenas letras e espaços no input
function filterLettersOnly(event: KeyboardEvent) {
  const char = event.key
  // Permite letras (a-z, A-Z), acentuadas (á, é, í, ó, ú, ã, õ, ç, etc) e espaços
  const isLetter = /^[a-zA-ZÀ-ÿ\u00f1\u00d1]$/.test(char)
  const isSpace = char === ' '
  const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Escape'].includes(char)
  const isModifierKey = event.ctrlKey || event.metaKey || event.altKey // Para Ctrl+A, Ctrl+C, Ctrl+V, etc

  if (!isLetter && !isSpace && !isControlKey && !isModifierKey) {
    event.preventDefault()
  }
}

// Função para filtrar texto colado, removendo caracteres não permitidos
function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const paste = event.clipboardData?.getData('text') || ''
  // Remove todos os caracteres que não são letras ou espaços
  const filteredText = paste.replace(/[^a-zA-ZÀ-ÿ\u00f1\u00d1 ]/g, '')

  // Atualiza o valor do input apenas com as letras e espaços válidos
  const currentValue = inputWord.value
  const input = event.target as HTMLInputElement
  const start = input.selectionStart || 0
  const end = input.selectionEnd || 0

  const newValue = currentValue.slice(0, start) + filteredText + currentValue.slice(end)
  inputWord.value = newValue
}
</script>

<template>
  <div class="game-container">
    <!-- Formulário de Nome (estilo similar ao LobbyGame) -->
    <div v-if="showNameInput" class="name-input-screen">
      <div class="logo-container">
        <img src="@/assets/images/logo/logo.png" class="game-logo" alt="Word Tower" draggable="false" />
      </div>

      <div class="name-form">
        <h2>Sala: {{ gameId }}</h2>
        <div class="form-group">
          <label>Digite seu nome:</label>
          <input v-model="playerName" type="text" placeholder="Ex: João" @keyup.enter="connectToGame"
            class="name-input" />
        </div>
        <button @click="connectToGame" :disabled="!playerName.trim()" class="btn-connect">
          Entrar no Jogo
        </button>
      </div>
    </div>

    <!-- Interface do Jogo -->
    <div v-else class="game-interface">
      <!-- Header mais clean -->
      <div class="game-header">
        <div class="header-left">
          <img src="@/assets/images/logo/logo.png" class="small-logo" alt="Word Tower" draggable="false" />
          <span class="room-name">{{ gameId }}</span>
        </div>
        <div class="header-right">
          <!-- Botão de configurações (apenas para host) -->
          <button v-if="gameStore.amIHost" @click="openGameSettings" :disabled="gameStore.gameStarted"
            class="btn-settings">
            ⚙️
          </button>
          <button @click="backToLobby" class="btn-back">Sair</button>
        </div>
      </div>

      <!-- Erro -->
      <div v-if="gameStore.lastError" class="error-message">
        ❌ {{ gameStore.lastError }}
        <button @click="clearError" class="btn-clear">✕</button>
      </div>

      <!-- Modal de Configurações do Jogo (apenas para host) -->
      <GenericModal v-model:open="showGameSettings" title="Configurações da Sala" background-color="#C7721E"
        border-color="#8A480F">
        <div class="settings-scroll">
          <div class="settings-content">
            <div class="settings-core">
              <div class="setting-time">
                <p>Tempo de Turno</p>
                <GenericSlider v-model="gameTimeIndex" :values="timeOptions" />
              </div>
              <div class="setting-difficulty">
                <p>Dificuldade</p>
                <GenericSlider v-model="difficultyIndex" :values="difficultyOptions" />
              </div>
              <div class="setting-difficulty">
                <p>Penalidade por Erro</p>
                <GenericSlider v-model="wrongPenaltyIndex" :values="wrongPenaltyOptions" />
              </div>
            </div>
            <div class="setting-difficulty">
              <p>Limitar Jogadores</p>
              <GenericSwitch v-model="maxPlayersEnabled" width="4rem" background-color="#FEE793" checked-color="#FFB107"
                border-color="#96550B" />
              <GenericSlider v-model="maxPlayersIndex" :values="maxPlayersOptions" :disabled="!maxPlayersEnabled" />
            </div>
            <div class="settings-actions">
              <button @click="saveGameSettings" class="btn-save-settings">Salvar</button>
            </div>
          </div>
        </div>
      </GenericModal>

      <!-- Interface principal mais clean -->
      <div class="main-game-area">
        <!-- Info da sala e jogadores (mais compacta) -->
        <div class="game-info">
          <div class="players-compact">
            <span class="players-count">👥 {{ gameStore.players.length }} jogadores</span>
            <div class="players-list">
              <span v-for="player in gameStore.players" :key="player.id" class="player-tag" :class="{
                'current-player': gameStore.currentPlayer && player.id === gameStore.currentPlayer.id,
                'eliminated': !player.is_active,
                'is-host': player.is_host,
                'is-me': player.id === gameStore.myPlayerId
              }">
                {{ player.name }}
                <span v-if="player.is_host">👑</span>
              </span>
            </div>
          </div>

          <!-- Timer mais limpo -->
          <div v-if="gameStore.gameStarted && gameStore.timerActive" class="timer-clean">
            <div class="timer-circle" :class="{
              'timer-warning': gameStore.remainingTime <= 10 && gameStore.remainingTime > 5,
              'timer-critical': gameStore.remainingTime <= 5
            }">
              {{ gameStore.remainingTime }}s
            </div>
            <div v-if="gameStore.currentPlayer" class="current-turn">
              {{ gameStore.isMyTurn ? 'Sua vez!' : `Vez de ${gameStore.currentPlayer.name}` }}
            </div>
          </div>
        </div>

        <!-- Controles do jogo (mais simples) -->
        <div v-if="!gameStore.gameStarted" class="game-start-area">
          <div v-if="gameStore.amIHost" class="host-controls">
            <button @click="startGame" :disabled="!gameStore.isConnected || gameStore.players.length < 2"
              class="btn-start-clean">
              🚀 Iniciar Jogo
            </button>
            <p class="start-hint">Configure a sala no botão ⚙️. O jogo exige no mínimo 2 jogadores.</p>
          </div>
          <div v-else class="waiting-host">
            <p>⏳ Aguardando o host iniciar o jogo...</p>
            <p v-if="gameStore.players.find((p: any) => p.is_host)" class="host-info">
              Host: <strong>{{gameStore.players.find((p: any) => p.is_host)?.name}}</strong>
            </p>
          </div>
        </div>
      </div>

      <!-- Victory State -->
      <div v-if="gameStore.isVictoryState" class="victory-overlay">
        <div class="victory-content">
          <h2 class="victory-title">🏆 VITÓRIA! 🏆</h2>
          <div class="winner-display">
            <div class="winner-name">{{ gameStore.winner }}</div>
          </div>
          <div class="victory-message">Parabéns! Você é o último jogador restante!</div>
          <div class="auto-reset-message">O jogo será reiniciado automaticamente em alguns segundos...</div>
        </div>
      </div>

      <!-- Estado do Jogo Ativo (mais clean) -->
      <div v-if="gameStore.gameStarted && !gameStore.isVictoryState" class="game-play-area">
        <!-- Palavra atual e próxima letra em um card -->
        <div class="word-card">
          <div class="current-word-section">
            <span class="word-label">Palavra atual:</span>
            <div class="current-word" v-html="highlightNextLetter(gameStore.currentWord, gameStore.nextLetterIndex)">
            </div>
          </div>
          <div class="next-letter-section">
            <span class="next-label">Próxima deve começar com:</span>
            <div class="next-letter">{{ gameStore.nextLetter.toUpperCase() }}</div>
          </div>
        </div>

        <!-- Input area mais clean -->
        <div v-if="gameStore.isMyTurn" class="input-area">
          <div class="input-group">
            <input ref="wordInput" v-model="inputWord" type="text" placeholder="Digite sua palavra..."
              @keydown="filterLettersOnly" @paste="handlePaste" @keyup.enter="submitWord"
              :disabled="!gameStore.isConnected || !gameStore.isMyTurn" class="word-input-clean" />
            <button @click="submitWord" :disabled="!canSubmitWord || !gameStore.isMyTurn" class="btn-submit-clean">
              Enviar
            </button>
          </div>
        </div>

        <!-- Mensagem de aguardo mais destacada -->
        <div v-if="!gameStore.isMyTurn" class="waiting-turn-highlight">
          <div class="waiting-icon">⏳</div>
          <div class="waiting-text">
            <h3>Aguarde sua vez!</h3>
            <p v-if="gameStore.currentPlayer">
              É a vez de <strong>{{ gameStore.currentPlayer.name }}</strong>
            </p>
          </div>
        </div>
      </div>

      <!-- Log de ações (mais simples) -->
      <div class="game-log">
        <h4>Historico</h4>
        <div ref="messagesContainer" class="log-container">
          <div v-for="message in gameStore.messages.slice(-10)" :key="message.id" class="log-entry"
            :class="{ 'system': message.sender === 'Sistema' }">
            <span class="log-time">{{ message.timestamp.split(' ')[1] }}</span>
            <span class="log-content">
              <strong v-if="message.sender !== 'Sistema'">{{ message.sender }}:</strong>
              {{ message.content }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Background -->
  <div class="page-background"></div>
</template>

<style scoped>
@font-face {
  font-family: 'Tomo Bossa Black';
  src: url('@/assets/fonts/tomo_bossa_black.woff') format('woff');
}

.game-container {
  position: relative;
  min-height: 100vh;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  overflow-x: auto;
}

/* Background igual ao LobbyGame */
.page-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image: url('@/assets/images/backgrounds/start_screen_bg.png');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: 45% 100%;
  z-index: 0;
}

/* Configurações Modal */
.settings-scroll {
  max-height: 62vh;
  overflow-y: auto;
  width: 100%;
  display: flex;
  justify-content: center;
  padding-right: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: #96550B #FAD280;
}

.settings-scroll::-webkit-scrollbar {
  width: 8px;
}

.settings-scroll::-webkit-scrollbar-track {
  background: #FAD280;
  border-radius: 0.3rem;
}

.settings-scroll::-webkit-scrollbar-thumb {
  background: #96550B;
  border-radius: 0.3rem;
}

.settings-scroll::-webkit-scrollbar-thumb:hover {
  background: #8A480F;
}

.settings-content {
  padding: 1rem;
  text-align: center;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 720px;
}

.settings-core {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.setting-time,
.setting-difficulty {
  padding: 1rem;
  background-color: #FAD280;
  border: 3px solid #96550B;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 620px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #502405;
}

.settings-actions {
  margin-top: 1rem;
}

.btn-save-settings {
  background-color: #FFB107;
  border: 3px solid #96550B;
  border-radius: 0.5rem;
  color: #502405;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  font-size: 1.1rem;
  padding: 0.8rem 2rem;
  cursor: pointer;
  box-shadow: 0 3px 0 0 #96550B;
  transition: all 0.1s ease;
}

.btn-save-settings:hover {
  transform: translateY(1px);
  box-shadow: 0 2px 0 0 #96550B;
}

/* Interface principal mais clean */
.main-game-area {
  background-color: rgba(199, 114, 30, 0.9);
  border: 0.2rem solid #8A480F;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.game-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.players-compact {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.players-count {
  font-size: 1rem;
  color: #502405;
  font-weight: bold;
}

.players-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.player-tag {
  background-color: #FAD280;
  border: 2px solid #96550B;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  font-size: 0.9rem;
  color: #502405;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.player-tag.current-player {
  background-color: #FFB107;
  border-color: #8A480F;
  font-weight: bold;
}

.player-tag.eliminated {
  background-color: #ccc;
  border-color: #999;
  text-decoration: line-through;
  opacity: 0.6;
}

.player-tag.is-host {
  background-color: #F9E79F;
  border-color: #D4AF37;
}

.player-tag.is-me {
  border-width: 3px;
  font-weight: bold;
}

.timer-clean {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.timer-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #2ed573;
  border: 3px solid #20bf6b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  transition: all 0.3s ease;
}

.timer-circle.timer-warning {
  background-color: #ffa502;
  border-color: #ff6348;
}

.timer-circle.timer-critical {
  background-color: #ff4757;
  border-color: #ff3742;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(1);
  }
}

.current-turn {
  font-size: 0.9rem;
  color: #502405;
  text-align: center;
}

.game-start-area {
  text-align: center;
  padding: 2rem;
}

.host-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.btn-start-clean {
  background-color: #27ae60;
  color: white;
  border: 3px solid #1e8449;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  font-size: 1.2rem;
  box-shadow: 0 3px 0 0 #1e8449;
  transition: all 0.1s;
}

.btn-start-clean:hover {
  transform: translateY(1px);
  box-shadow: 0 2px 0 0 #1e8449;
}

.btn-start-clean:disabled {
  background-color: #95a5a6;
  border-color: #7f8c8d;
  cursor: not-allowed;
}

.start-hint {
  font-size: 0.9rem;
  color: #502405;
  margin: 0;
}

.waiting-host {
  color: #502405;
}

.host-info {
  margin: 0;
  font-size: 0.9rem;
}

.game-play-area {
  background-color: rgba(199, 114, 30, 0.9);
  border: 0.2rem solid #8A480F;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.word-card {
  background-color: #FAD280;
  border: 3px solid #96550B;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.current-word-section,
.next-letter-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.word-label,
.next-label {
  font-size: 0.9rem;
  color: #502405;
  font-weight: bold;
}

.current-word {
  font-size: 1.8rem;
  font-weight: bold;
  color: #8A480F;
}

.next-letter {
  font-size: 2rem;
  font-weight: bold;
  color: #8A480F;
  background-color: #FFB107;
  padding: 0.3rem 0.8rem;
  border-radius: 0.3rem;
  border: 2px solid #96550B;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-area.disabled {
  opacity: 0.6;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.word-input-clean {
  flex: 1;
  padding: 0.8rem;
  border: 3px solid #96550B;
  border-radius: 0.3rem;
  font-size: 1.1rem;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  background-color: #FEE793;
  color: #502405;
}

.word-input-clean:focus {
  outline: none;
  border-color: #8A480F;
  box-shadow: 0 0 0 2px rgba(138, 72, 15, 0.3);
}

.btn-submit-clean {
  background-color: #3498db;
  color: white;
  border: 3px solid #2980b9;
  padding: 0.8rem 1.5rem;
  border-radius: 0.3rem;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  font-size: 1rem;
  box-shadow: 0 2px 0 0 #2980b9;
  transition: all 0.1s;
}

.btn-submit-clean:hover {
  transform: translateY(1px);
  box-shadow: 0 1px 0 0 #2980b9;
}

.btn-submit-clean:disabled {
  background-color: #95a5a6;
  border-color: #7f8c8d;
  cursor: not-allowed;
}

.waiting-turn-highlight {
  background-color: #FFB107;
  border: 3px solid #96550B;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  animation: pulse-waiting 2s infinite;
}

.waiting-icon {
  font-size: 3rem;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse-waiting {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.02);
  }
}

.waiting-text h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #502405;
}

.waiting-text p {
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
  color: #8A480F;
}

.waiting-text strong {
  color: #502405;
}

.game-log {
  background-color: rgba(199, 114, 30, 0.9);
  border: 0.2rem solid #8A480F;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.game-log h4 {
  margin: 0 0 0.5rem 0;
  color: #502405;
  font-size: 1.1rem;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.log-entry {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  padding: 0.3rem;
  border-radius: 0.2rem;
  background-color: rgba(250, 210, 128, 0.5);
}

.log-entry.system {
  background-color: rgba(255, 177, 7, 0.3);
  font-style: italic;
}

.log-time {
  color: #8A480F;
  font-size: 0.8rem;
  min-width: 3rem;
}

.log-content {
  color: #502405;
  flex: 1;
}

/* Tela de input do nome (similar ao lobby) */
.name-input-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  gap: 2rem;
}

.logo-container {
  text-align: center;
}

.game-logo {
  width: 20rem;
  height: auto;
}

.name-form {
  background-color: #C7721E;
  border: 0.3rem solid #8A480F;
  border-radius: 0.5rem;
  box-shadow: 0 0.6rem 0 0 #8A480F;
  padding: 2rem;
  text-align: center;
  color: #502405;
}

.name-form h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
}

.form-group {
  margin: 1rem 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
  font-weight: bold;
}

.name-input {
  width: 15rem;
  padding: 0.8rem;
  border: 0.2rem solid #96550B;
  border-radius: 0.3rem;
  background-color: #FEE793;
  font-size: 1rem;
  text-align: center;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
}

.btn-connect {
  background-color: #FFB107;
  border: 0.2rem solid #96550B;
  color: #502405;
  padding: 0.8rem 2rem;
  border-radius: 0.3rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  box-shadow: 0 0.3rem 0 0 #96550B;
  transition: all 0.1s;

  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, #FFB107, white 20%);
    transform: translateY(-2px);
    box-shadow: 0 10px 0 0 #96550B;
  }

  &:active:not(:disabled) {
    background-color: color-mix(in srgb, #FFB107, black 10%);
    transform: translateY(8px);
    box-shadow: 0 0 0 0 #96550B;
  }
}

.btn-connect:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Interface principal do jogo */
.game-interface {
  position: relative;
  z-index: 5;
  min-height: 100vh;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(199, 114, 30, 0.95);
  border: 0.2rem solid #8A480F;
  border-radius: 0.5rem;
  padding: 1rem 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.small-logo {
  height: 2.5rem;
  width: auto;
}

.room-name {
  font-size: 1.3rem;
  font-weight: bold;
  color: #502405;
  background-color: rgba(250, 210, 128, 0.8);
  padding: 0.3rem 0.8rem;
  border-radius: 0.3rem;
  border: 2px solid #96550B;
}

.btn-settings {
  background-color: #FFB107;
  color: #502405;
  border: 2px solid #96550B;
  padding: 0.5rem;
  border-radius: 0.3rem;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  font-size: 1rem;
  box-shadow: 0 2px 0 0 #96550B;
  transition: all 0.1s;
}

.btn-settings:hover {
  transform: translateY(1px);
  box-shadow: 0 1px 0 0 #96550B;
}

.btn-settings:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 0 0 #96550B;
}

.btn-back {
  background-color: #D32F2F;
  color: white;
  border: 2px solid #B71C1C;
  padding: 0.5rem 1rem;
  border-radius: 0.3rem;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  box-shadow: 0 2px 0 0 #B71C1C;
  transition: all 0.1s;
}

.btn-back:hover {
  transform: translateY(1px);
  box-shadow: 0 1px 0 0 #B71C1C;
}

/* Seções do jogo */
.players-section,
.game-controls,
.game-active,
.messages-section {
  background-color: #C7721E;
  border: 0.2rem solid #8A480F;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 0.3rem 0 0 #8A480F;
  color: #502405;
}

.players-section h3,
.game-controls h3,
.game-active h3,
.messages-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.8rem;
}

.player-card {
  background-color: #FAD280;
  border: 0.15rem solid #96550B;
  border-radius: 0.3rem;
  padding: 0.8rem;
  text-align: center;
  position: relative;
}

.player-name {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  font-weight: bold;
  margin-bottom: 0.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  line-height: 1.2;
  max-height: calc(1.2em * 3);
  cursor: help;
  transition: opacity 0.2s ease;
}

.player-name:hover {
  opacity: 0.8;
}

/* Truncate para nome do jogador atual no indicador de turno */
.current-player-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  line-height: 1.2;
  max-height: calc(1.2em * 2);
  cursor: help;
  transition: opacity 0.2s ease;
}

.current-player-name:hover {
  opacity: 0.8;
}

/* Truncate para nome do host */
.host-name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  line-height: 1.2;
  max-height: calc(1.2em * 2);
  cursor: help;
  transition: opacity 0.2s ease;
}

.host-name:hover {
  opacity: 0.8;
}

.you-badge {
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  background-color: #4CAF50;
  color: white;
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
}

.host-badge {
  position: absolute;
  top: -0.3rem;
  left: -0.3rem;
  background-color: #FFD700;
  color: #333;
  font-size: 0.6rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
  font-weight: bold;
}

.turn-badge {
  position: absolute;
  top: -0.5rem;
  left: -0.5rem;
  background-color: #FF9800;
  color: white;
  font-size: 0.6rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
  animation: pulse 1s infinite;
}

.eliminated-badge {
  position: absolute;
  top: -0.3rem;
  left: -0.3rem;
  background-color: #F44336;
  color: white;
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
}

.turn-indicator {
  margin-top: 1rem;
  text-align: center;
  padding: 1rem;
  border-radius: 0.3rem;
  font-weight: bold;
}

.my-turn {
  color: #4CAF50;
  background-color: #E8F5E8;
  padding: 0.8rem;
  border-radius: 0.3rem;
  display: inline-block;
  animation: pulse 2s infinite;
}

.other-turn {
  color: #FF9800;
  background-color: #FFF3E0;
  padding: 0.8rem;
  border-radius: 0.3rem;
  display: inline-block;
}

.not-your-turn {
  text-align: center;
  color: #666;
  font-style: italic;
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: #F5F5F5;
  border-radius: 0.3rem;
}

/* Timer Styles */
.timer-container {
  margin: 1rem 0;
  text-align: center;
}

.timer-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem;
  border-radius: 0.5rem;
  background-color: #E8F8F5;
  border: 2px solid #2ed573;
  transition: all 0.3s ease;
  margin-bottom: 0.5rem;
}

.timer-display.timer-warning {
  background-color: #FFF3E0;
  border-color: #ffa502;
  animation: pulse-warning 1s infinite;
}

.timer-display.timer-critical {
  background-color: #FFEBEE;
  border-color: #ff4757;
  animation: pulse-critical 0.5s infinite;
}

.timer-icon {
  font-size: 1.5rem;
}

.timer-text {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2d3436;
}

.timer-bar-container {
  width: 100%;
  height: 8px;
  background-color: #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  transition: width 1s linear, background-color 0.3s ease;
  border-radius: 4px;
}

@keyframes pulse-warning {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}

@keyframes pulse-critical {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* Victory Overlay Styles */
.victory-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.5s ease;
}

.victory-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 3rem;
  border-radius: 1rem;
  text-align: center;
  color: white;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.5s ease;
}

.victory-title {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  animation: bounce 1s infinite;
}

.winner-display {
  margin: 1.5rem 0;
}

.winner-name {
  font-size: 2rem;
  font-weight: bold;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.victory-message {
  font-size: 1.2rem;
  margin: 1rem 0;
  opacity: 0.9;
}

.auto-reset-message {
  font-size: 1rem;
  opacity: 0.7;
  font-style: italic;
  margin-top: 1.5rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes bounce {

  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-10px);
  }

  60% {
    transform: translateY(-5px);
  }
}

.host-only-message {
  text-align: center;
  background-color: #FFF3E0;
  border: 1px solid #FF9800;
  border-radius: 0.3rem;
  padding: 1rem;
  margin: 1rem 0;
  color: #E65100;
}

.host-only-message p {
  margin: 0.5rem 0;
}

.host-only-message strong {
  color: #FF6F00;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }

  100% {
    opacity: 1;
  }
}

.control-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.control-row label {
  font-weight: bold;
  min-width: 100px;
}

.difficulty-select {
  flex: 1;
  padding: 0.5rem;
  border: 0.15rem solid #96550B;
  border-radius: 0.3rem;
  background-color: #FEE793;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
}

.btn-start {
  width: 100%;
  background-color: #4CAF50;
  color: white;
  border: 0.2rem solid #2E7D32;
  padding: 1rem;
  border-radius: 0.3rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  box-shadow: 0 0.3rem 0 0 #2E7D32;
  margin-top: 1rem;
  transition: all 0.1s;

  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, #4CAF50, white 20%);
    transform: translateY(-2px);
    box-shadow: 0 10px 0 0 #2E7D32;
  }

  &:active:not(:disabled) {
    background-color: color-mix(in srgb, #4CAF50, black 10%);
    transform: translateY(8px);
    box-shadow: 0 0 0 0 #2E7D32;
  }
}

.btn-start:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.game-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.difficulty-badge {
  padding: 0.5rem 1rem;
  border-radius: 0.3rem;
  font-weight: bold;
}

.difficulty-badge.easy {
  background-color: #C8E6C9;
  color: #2E7D32;
}

.difficulty-badge.normal {
  background-color: #FFF3C4;
  color: #F57F17;
}

.difficulty-badge.caotic {
  background-color: #FFCDD2;
  color: #D32F2F;
}

.word-display-container,
.next-letter-container {
  text-align: center;
  margin: 1.5rem 0;
}

.current-word-display {
  font-size: 2rem;
  font-weight: bold;
  margin: 1rem 0;
  background-color: #FAD280;
  padding: 1rem;
  border-radius: 0.3rem;
  border: 0.15rem solid #96550B;
}

.next-letter-badge {
  display: inline-block;
  font-size: 1.8rem;
  font-weight: bold;
  background-color: #FFCDD2;
  color: #D32F2F;
  padding: 0.8rem 1.5rem;
  border-radius: 50%;
  border: 0.2rem solid #D32F2F;
  box-shadow: 0 0.2rem 0 0 #D32F2F;
}

.word-input-container {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.word-input {
  flex: 1;
  padding: 1rem;
  border: 0.2rem solid #96550B;
  border-radius: 0.3rem;
  background-color: #FEE793;
  font-size: 1.1rem;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
}

.btn-submit {
  background-color: #2196F3;
  color: white;
  border: 0.2rem solid #1976D2;
  padding: 1rem 2rem;
  border-radius: 0.3rem;
  font-weight: bold;
  cursor: pointer;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  box-shadow: 0 0.2rem 0 0 #1976D2;
  transition: all 0.1s;

  &:hover:not(:disabled) {
    background-color: color-mix(in srgb, #2196F3, white 20%);
    transform: translateY(-2px);
    box-shadow: 0 10px 0 0 #1976D2;
  }

  &:active:not(:disabled) {
    background-color: color-mix(in srgb, #2196F3, black 10%);
    transform: translateY(8px);
    box-shadow: 0 0 0 0 #1976D2;
  }
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.messages-container {
  max-height: 200px;
  overflow-y: auto;
  background-color: #FAD280;
  border: 0.15rem solid #96550B;
  border-radius: 0.3rem;
  padding: 1rem;

  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #96550B #FAD280;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #FAD280;
    border-radius: 0.2rem;
  }

  &::-webkit-scrollbar-thumb {
    background: #96550B;
    border-radius: 0.2rem;
    border: 1px solid #FAD280;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #8A480F;
  }

  &::-webkit-scrollbar-thumb:active {
    background: #502405;
  }
}

.message {
  margin-bottom: 0.8rem;
  padding: 0.5rem;
  border-radius: 0.3rem;
  max-width: 80%;
}

.message.system-message {
  background-color: #E0E0E0;
  font-style: italic;
  margin: 0 auto 0.8rem auto;
  text-align: center;
  max-width: 90%;
}

.message.my-message {
  background-color: #E3F2FD;
  border-left: none;
  border-right: 0.3rem solid #2196F3;
  margin-left: auto;
  margin-right: 0;
  text-align: right;
}

.message-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  margin-bottom: 0.3rem;
  opacity: 0.8;
}

.message.my-message .message-header {
  flex-direction: row-reverse;
  gap: 0.5rem;
}

.message-sender {
  font-weight: bold;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  cursor: help;
  max-width: 150px;
  transition: opacity 0.2s ease;
}

.message-sender:hover {
  opacity: 0.8;
}

.message-content {
  font-size: 0.9rem;
}

.error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #FFEBEE;
  color: #D32F2F;
  border: 0.15rem solid #D32F2F;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
  max-width: 400px;
  min-width: 300px;
  font-family: 'Tomo Bossa Black', Arial, sans-serif;
  font-weight: bold;

  /* Animação de entrada */
  animation: slideInFromRight 0.3s ease-out;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Animação de saída */
.error-message.fade-out {
  animation: slideOutToRight 0.3s ease-in forwards;
}

@keyframes slideOutToRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }

  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

.btn-clear {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  color: #D32F2F;
  font-weight: bold;
  border-radius: 50%;
  transition: all 0.1s;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-left: 1rem;

  &:hover {
    background-color: color-mix(in srgb, #D32F2F, white 85%);
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
  }

  &:active {
    background-color: color-mix(in srgb, #D32F2F, white 75%);
    transform: scale(0.95);
    box-shadow: 0 1px 4px rgba(211, 47, 47, 0.3);
  }
}

/* Custom scrollbar global para elementos que podem ter overflow */
.game-interface {
  scrollbar-width: thin;
  scrollbar-color: #8A480F #C7721E;
}

.game-interface::-webkit-scrollbar {
  width: 10px;
}

.game-interface::-webkit-scrollbar-track {
  background: #C7721E;
  border-radius: 0.3rem;
}

.game-interface::-webkit-scrollbar-thumb {
  background: #8A480F;
  border-radius: 0.3rem;
  border: 1px solid #C7721E;
}

.game-interface::-webkit-scrollbar-thumb:hover {
  background: #502405;
}

/* Responsividade */
@media (max-width: 768px) {
  .game-interface {
    padding: 0.5rem;
  }

  .game-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .players-grid {
    grid-template-columns: 1fr;
  }

  .word-input-container {
    flex-direction: column;
  }

  .game-logo {
    width: 15rem;
  }

  .error-message {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: auto;
    margin: 0;
  }

  @keyframes slideInFromRight {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }

    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideOutToRight {
    from {
      transform: translateY(0);
      opacity: 1;
    }

    to {
      transform: translateY(-100%);
      opacity: 0;
    }
  }
}
</style>
