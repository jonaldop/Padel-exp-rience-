# Back-end NestJS — image de production
FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
# Données persistées (MVP fichier JSON). En prod scale : remplacer par Postgres.
VOLUME ["/app/data"]
ENV DB_FILE=/app/data/data.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
