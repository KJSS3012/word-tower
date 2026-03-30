<script lang="ts" setup>
import GenericButton from '@/components/Buttons/GenericButton.vue';
import GenericInput from '@/components/Inputs/GenericInput.vue'
import GenericLabel from '@/components/Labels/GenericLabel.vue'
import { Play } from 'lucide-vue-next';
import { ref } from 'vue';
import router from '@/router';

const showStartScreen = ref(true)
const showGameLobby = ref(false)
const isLogoMoving = ref(false)

const startGame = () => {
  const startOverlay = document.querySelector('.start-overlay');
  startOverlay?.classList.add('fade-out');

  setTimeout(() => {
    showStartScreen.value = false
    isLogoMoving.value = true

    setTimeout(() => {
      showGameLobby.value = true
    }, 600)
  }, 400)
}

const startGameRoom = () => {
  const roomNameInput = document.getElementById('room_name') as HTMLInputElement | null;
  const playerNameInput = document.getElementById('player_name') as HTMLInputElement | null;

  const roomName = roomNameInput ? roomNameInput.value.trim() : '';
  const playerName = playerNameInput ? playerNameInput.value.trim() : '';

  if (!roomName) {
    roomNameInput?.focus();
    return;
  }

  if (!playerName) {
    playerNameInput?.focus();
    return;
  }

  // As configurações serão definidas pelo host no jogo

  // Salvar o nome do jogador no localStorage para usar na próxima tela
  localStorage.setItem('pendingPlayerName', playerName);

  const roomId = roomName.toLowerCase();

  // Navegar para o jogo apenas com o ID da sala
  router.push({
    name: 'game',
    params: { gameId: roomId }
  });
}
</script>

<template>
  <!-- Tela inicial com overlay -->
  <div v-if="showStartScreen" class="start-screen">
    <div class="start-overlay">
      <div class="start-content">
        <img src="@/assets/images/logo/logo.png" class="start-logo" alt="Word Tower" draggable="false" />
        <div class="button-start-content">
          <GenericButton aspect-ratio="1" background-color="#FFB107" border-color="#96550B" :handle-click="startGame">
            <Play :size="150" color="#96550B" fill="white" />
          </GenericButton>
        </div>
      </div>
    </div>
  </div>

  <!-- Logo animada que sobe -->
  <div class="floating-logo" :class="{ 'move-to-top': isLogoMoving }">
    <img src="@/assets/images/logo/logo.png" class="logo" alt="Word Tower" draggable="false" />
  </div>



  <!-- Lobby do jogo -->
  <div v-if="showGameLobby" class="game-lobby">
    <div class="lobby-form">
      <div class="form-group">
        <GenericLabel position="start" font-size="1rem" color="#502405">Nome do Jogador</GenericLabel>
        <GenericInput type="text" background-color="#FEE793" border-color="#96550B" placeholder="Digite seu nome"
          font-size="1rem" id="player_name" />
      </div>
      <div class="form-group">
        <GenericLabel position="start" font-size="1rem" color="#502405">Nome da Sala</GenericLabel>
        <GenericInput type="text" background-color="#FEE793" border-color="#96550B" placeholder="Nome da sala"
          font-size="1rem" id="room_name" :required="true" />
      </div>
      <GenericButton aspect-ratio="3" background-color="#FFB107" border-color="#96550B" font-size="2rem"
        :handle-click="startGameRoom">
        Iniciar Jogo
      </GenericButton>
    </div>
  </div>

  <!-- Background fixo -->
  <div class="page-background"></div>
</template>

<style scoped>
@font-face {
  font-family: 'Tomo Bossa Black';
  src: url('@/assets/fonts/tomo_bossa_black.woff') format('woff');
}

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

.start-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.start-overlay {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.4s ease;

  &.fade-out {
    opacity: 0;
    pointer-events: none;
  }
}

.start-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
}

.button-start-content {
  width: 10rem;
}

.start-logo {
  width: 25rem;
  height: auto;
}

.floating-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  transition: all 0.8s ease-out;
  opacity: 0;

  &.move-to-top {
    opacity: 1;
    top: 3%;
    transform: translate(-50%, 0);
  }

  .logo {
    width: 15rem;
    height: auto;
  }
}

.settings-button {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 5;
  animation: slideInFromLeft 0.6s ease-out 0.4s both;
}

.game-lobby {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -30%) !important;
  z-index: 5;
  animation: slideInFromBottom 0.6s ease-out 0.6s both;
  background-color: #C7721E;
  border: 0.3rem solid #8A480F;
  border-radius: 0.5rem;
  box-shadow: 0 0.6rem 0 0 #8A480F;
  padding: 1.5rem;
  min-width: 20rem;
}

.lobby-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  min-width: 15rem;
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
  width: 90%;
}

.setting-time,
.setting-difficulty {
  padding: 1rem;
  background-color: #FAD280;
  border: 3px solid #96550B;
  border-radius: 0.5rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #502405;
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-2rem);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 2rem));
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
</style>