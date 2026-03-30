# Word Tower

![Version](https://img.shields.io/badge/version-2.0-2563eb)

Word Tower e um jogo multiplayer de palavras em tempo real.

O projeto utiliza arquitetura modular com frontend em Vue 3 + TypeScript e backend em Node.js + TypeScript, com comunicacao via Socket.IO.

## Visao Geral

- Foco atual: organizacao em camadas (domain, rules, application, infrastructure, ws, types)
- Frontend: `front`
- Backend em TypeScript: `back_2` (estrutura temporaria de pasta)

## Estrutura Do Projeto

- `back_2`: backend principal em Node.js + TypeScript
- `front`: cliente web (Vue 3 + TypeScript)
- `back`: backend legado em Python (mantido para referencia)

## Requisitos

- Node.js 20+
- npm 10+

## Como Executar

1. Clone o repositorio.

```bash
git clone https://github.com/KJSS3012/word-tower.git
cd word-tower
```

2. Instale e execute o backend.

```bash
cd back_2
npm install
npm run dev
```

3. Em outro terminal, instale e execute o frontend.

```bash
cd front
npm install
npm run dev
```

4. Acesse a aplicacao.

```text
http://localhost:5173
```

## Portas Padrao

- Frontend: `5173`
- Backend: `3000`

Para alterar o endpoint no frontend, configure `VITE_GAME_SERVER_URL`.

## Regras Do Jogo

- Cada nova palavra deve respeitar a letra exigida pela rodada.
- A palavra deve existir no dicionario da dificuldade ativa.
- Palavras repetidas nao sao aceitas.

## Dificuldades

| Dificuldade | Dicionario  | Proxima Letra              |
| ----------- | ----------- | -------------------------- |
| easy        | sem acentos | ultima letra               |
| normal      | com acentos | ultima letra               |
| caotic      | com acentos | letra aleatoria da palavra |

## Scripts Principais

`back_2`

- `npm run dev`: inicia servidor em desenvolvimento
- `npm run build`: compila o projeto TypeScript

`front`

- `npm run dev`: inicia cliente em desenvolvimento
- `npm run type-check`: valida tipagem
- `npm run build`: gera build de producao

## Contexto Academico

Projeto academico desenvolvido para a disciplina de Programacao I (Ciencia da Computacao, UFCG).

A versao 1.0, com backend em Python, foi o ponto inicial para a evolucao desta aplicacao.
