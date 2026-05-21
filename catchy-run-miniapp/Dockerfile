FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev --workspaces

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PORT=8787

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/backend/package*.json backend/
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/node_modules backend/node_modules
COPY --from=build /app/frontend/dist frontend/dist

EXPOSE 8787

CMD ["node", "backend/dist/src/server.js"]
