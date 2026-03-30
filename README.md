# Word Tower

![Version](https://img.shields.io/badge/version-2.0-2563eb)

Word Tower e um jogo multiplayer de palavras em tempo real.

Esta versao consolida a migracao do backend de Python para Express + TypeScript e adota uma arquitetura modular em camadas, com comunicacao via Socket.IO.

## Visao Geral

- Frontend em Vue 3 + TypeScript
- Backend em Express + TypeScript
- Comunicacao em tempo real com Socket.IO
- Configuracoes de sala controladas pelo host
- Fluxo multiplayer com eliminacao por tempo e validacao de palavras

## Arquitetura

Backend e frontend seguem uma organizacao modular semelhante:

- `domain`: entidades e estado principal
- `rules`: regras de negocio
- `application`: orquestracao de casos de uso
- `infrastructure`: acesso a dados/armazenamento e dicionario
- `ws`: camada de eventos WebSocket
- `types`: contratos e tipagens compartilhadas no modulo

## Estrutura Do Projeto

- `back`: backend principal (Express + TypeScript)
- `front`: cliente web (Vue 3 + TypeScript)

## Requisitos

- Node.js 20+
- npm 10+

## Instalacao

```bash
git clone https://github.com/KJSS3012/word-tower.git
cd word-tower

cd back
npm install

cd ../front
npm install
```

## Configuracao De Ambiente

Backend (`back/.env`):

```env
PORT=3000
NODE_ENV=development
```

Frontend (opcional):

- `VITE_GAME_SERVER_URL` (padrao: `http://localhost:3000`)

## Executando Em Desenvolvimento

Em dois terminais separados:

```bash
# Terminal 1
cd back
npm run dev
```

```bash
# Terminal 2
cd front
npm run dev
```

Aplicacao disponivel em `http://localhost:5173`.

## Build De Producao

Backend:

```bash
cd back
npm run build
npm run start
```

Frontend:

```bash
cd front
npm run build
npm run preview
```

## Scripts Principais

### back

- `npm run dev`: inicia o servidor em modo desenvolvimento
- `npm run build`: compila TypeScript para `dist`
- `npm run start`: executa o servidor compilado

### front

- `npm run dev`: inicia o cliente em desenvolvimento
- `npm run type-check`: executa validacao de tipos
- `npm run build`: gera build de producao
- `npm run preview`: sobe o build localmente para validacao

## Regras Do Jogo

- A palavra enviada deve respeitar a letra exigida da rodada.
- A palavra precisa existir no dicionario da dificuldade ativa.
- Palavras repetidas nao sao aceitas.
- Respostas invalidas aplicam penalidade no tempo restante do turno.
- O jogo exige no minimo 2 jogadores para iniciar.

## Dificuldades

| Dificuldade | Dicionario  | Proxima Letra              |
| ----------- | ----------- | -------------------------- |
| easy        | sem acentos | ultima letra               |
| normal      | com acentos | ultima letra               |
| caotic      | com acentos | letra aleatoria da palavra |

## Contexto Academico

Projeto academico desenvolvido na disciplina de Programacao I (Ciencia da Computacao, UFCG).

A versao 1.0 com backend em Python foi a base para a evolucao da versao atual.
