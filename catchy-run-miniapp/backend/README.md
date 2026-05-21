# CATCHY RUN Backend

Local Express + TypeScript API for the CATCHY RUN Telegram Mini App economy.

## Run Locally

```bash
npm install
npm run dev
```

The server listens on `http://127.0.0.1:8787` by default.

Optional environment variables:

```bash
PORT=8787
CATCHY_DB_PATH=backend/data/local.sqlite
DATABASE_URL=postgres://...
TELEGRAM_BOT_TOKEN=123456:bot-token-from-botfather
```

## Verify

```bash
npm run build
npm test
```

## Persistence

Local development uses a SQLite file at `backend/data/local.sqlite`. Tests use an in-memory store.
When `DATABASE_URL` exists, the API stores the app state in Fly Postgres and creates the `app_state` table automatically.

## Telegram Auth

Mock auth works locally without Telegram. Real Telegram Mini App auth requires `TELEGRAM_BOT_TOKEN`; the frontend sends `window.Telegram.WebApp.initData`, and the backend validates the signed payload before creating or loading the user.
