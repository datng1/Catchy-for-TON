# CATCHY RUN Telegram Mini App MVP

Local-first full-stack MVP for the CATCHY RUN Telegram Mini App.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node + TypeScript + Express
- Local persistence: SQLite file under `backend/data/local.sqlite`, with an in-memory fallback for tests.
- Production persistence: Fly Postgres via `DATABASE_URL`.

## Run

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

Backend: `http://127.0.0.1:8787`

## Production Env

```bash
DATABASE_URL=postgres://...
TELEGRAM_BOT_TOKEN=123456:bot-token-from-botfather
```

`DATABASE_URL` is created by Fly when the Postgres app is attached. `TELEGRAM_BOT_TOKEN` is required for real Telegram `initData` validation; without it, only local mock auth should be used.

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

Catchy Points are in-app activity points. They are not tokens or money, but they will be a major factor in calculating future rewards if rewards are announced.
