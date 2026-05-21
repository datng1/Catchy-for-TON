FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8787

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/backend/package*.json backend/
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

EXPOSE 8787

CMD ["node", "backend/dist/src/server.js"]
