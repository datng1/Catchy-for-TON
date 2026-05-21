# CATCHY RUN Telegram Mini App MVP

Local-first full-stack MVP for the CATCHY RUN Telegram Mini App.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node + TypeScript + Express
- Local persistence: SQLite file under `backend/data/local.sqlite`, with an in-memory/file fallback for tests.

## Run

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

Backend: `http://127.0.0.1:8787`

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Visual Direction

The MVP ships with a code-native light-blue CATCHY mascot and button style so it runs immediately. Raster assets can replace it later using this prompt:

```text
Cute but sharp blue speed rabbit mascot made of TON-inspired energy, light blue and cyan color palette, playful Telegram mini app game character, clever confident expression, aerodynamic ears, glossy 3D sticker style, crisp silhouette, high detail, friendly but mischievous, transparent background, no text, no logos.
```

Meme Points are in-app points only. They are not tokens, not money, and do not guarantee any future reward.
