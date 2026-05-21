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
```

## Verify

```bash
npm run build
npm test
```

## Persistence

The MVP uses a local SQLite file at `backend/data/local.sqlite`. Tests use an in-memory store.
For production Telegram traffic, migrate the same logical tables to PostgreSQL.
