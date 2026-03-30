import express from "express";
import http from "http";
import { Server } from "socket.io";
import config from "./shared/config/config";
import { GameService } from "./modules/game/application/GameService";
import { TurnService } from "./modules/game/application/TurnService";
import { DictionaryService } from "./modules/game/infrastructure/dictionary/DictionaryService";
import { GameStore } from "./modules/game/infrastructure/store/GameStore";
import { registerGameHandlers } from "./modules/game/ws/game.handler";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const gameStore = new GameStore();
const dictionaryService = new DictionaryService();
const turnService = new TurnService();
const gameService = new GameService(gameStore, dictionaryService, turnService);

registerGameHandlers(io, gameService);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});