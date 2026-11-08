# Архитектура TASKO

```
[Vue SPA] --REST--> [NestJS API] --Prisma--> [PostgreSQL]
```

ML-контур из спецификации отложен: отдельный FastAPI-сервис подключать после стабилизации CRUD.

## Frontend

Повторяет паттерн `dreamteam-front`:

- `baseApi.<domain>.<method>(pathParams, params, payload, signal)`
- `createGet/Post/Patch/Delete` + Zod
- `useFetch` для запросов в компонентах
- feature-папки в `src/pages`
- Pinia только для сессии
- Element Plus + `BaseFlex`

## Backend

Модули NestJS: `auth`, `users`, `access` (права ролей), `invitations`, `projects`, `tasks` (задачи, подзадачи, зависимости), `attachments`, `comments`, `notifications` (в том числе ежечасные напоминания о сроке через `@nestjs/schedule`), `analytics`, `dashboard`, `settings`, `table-layouts`, `avatars`, `mail`.

Файлы (аватары, вложения) лежат в `backend/storage/`; в базе хранятся только метаданные.

Глобально: JWT guard, wrap-interceptor `{ data }`, exception filter без stack trace.

## Права

- `ADMIN` — все проекты и пользователи
- `MANAGER` — создаёт проекты, управляет своими
- `EXECUTOR` — работает с доступными задачами
- Проектная роль `MANAGER` / `MEMBER` проверяется отдельно
