# TASKO

WEB-система управления проектами. Проекты, задачи с подзадачами, зависимостями и вложениями, workflow, комментарии, уведомления, аналитика и ML-прогноз длительности задачи и риска срыва срока.

Спецификация лежит в корне репозитория.

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

## ML-модуль

Прогноз длительности задачи и риска срыва срока лежит в [`ml/`](ml/README.md): обучение на истории задач, сравнение алгоритмов и FastAPI-сервис прогноза. 

Как включить прогноз в приложении:

```bash
cd ml
.venv/Scripts/python -m tasko_ml.train --source db --db-url "postgresql://tasko:tasko@localhost:5434/tasko"
.venv/Scripts/python -m uvicorn service.app:app --port 8001
```

В `backend/.env` должно быть `ML_SERVICE_URL="http://localhost:8001"`. Бэкенд пересчитывает прогноз при создании задачи,
при смене полей, от которых он зависит, и по кнопке «Пересчитать» в карточке задачи. Если сервис выключен или моделей
нет, приложение работает как раньше и показывает оценку по простым правилам с пометкой «По правилам».

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
