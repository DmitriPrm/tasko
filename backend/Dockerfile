# API TASKO (NestJS + Prisma). Запуск — через docker-compose.yml в корне.
FROM node:22-slim

# Prisma нужен OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Миграции применяются при каждом старте (уже применённые пропускаются).
# Демо-данные: SEED_DEMO=true — сид безопасно запускать повторно, он не создаёт дубликатов.
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$SEED_DEMO\" = \"true\" ]; then npx prisma db seed; fi && node dist/main"]
