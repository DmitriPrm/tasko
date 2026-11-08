# TASKO

WEB-система управления проектами. Текущая версия — MVP без ML: проекты, задачи, workflow, комментарии, уведомления и аналитика.

Спецификация с ML-контуром лежит в корне репозитория. ML, вложения и зависимости задач добавим отдельным этапом.

## Стек

- Frontend: Vue 3, TypeScript, Vite, Pinia, Axios, Element Plus, Zod
- Backend: NestJS, Prisma, PostgreSQL, JWT
- Документация API: Swagger

## Быстрый старт

Нужны Node.js 22 и запущенный Docker Desktop.

```bash
docker compose up -d postgres
# Postgres слушает localhost:5434, потому что 5432 часто занят

cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev

cd ../frontend
npm install
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/docs

## Проверки кода

```bash
cd backend
npm run lint          # ESLint
npm run format:check  # Prettier (npm run format — исправить)
npm test              # Jest

cd ../frontend
npm run lint
npm run format:check
npm test              # Vitest
npm run typecheck     # vue-tsc
```

Общие настройки форматирования — в `.prettierrc.json` и `.editorconfig` в корне.

## Демо-доступ

Пароль для всех: `Password123!`

| Роль | Email |
|---|---|
| Администратор | admin@tasko.local |
| Руководитель | manager@tasko.local |
| Исполнитель | executor@tasko.local |

## Документация

- [Архитектура](docs/architecture.md)
- [Состав MVP](docs/mvp.md)
- [API](docs/api.md)
- [Frontend](frontend/README.md)
- [Backend](backend/README.md)

Правила для агента лежат в `.cursor/rules`.
