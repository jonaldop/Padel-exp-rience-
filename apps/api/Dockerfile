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
# Données MVP (fichier JSON) dans /app (éphémère sur Railway sans volume attaché).
# Pour persister : attacher un Railway Volume et pointer DB_FILE dessus.
# Pour le scale : migrer vers Postgres/Supabase (cf. docs/DEPLOIEMENT.md).
ENV DB_FILE=/app/data.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
