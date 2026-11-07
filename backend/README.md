# TASKO Backend

NestJS + Prisma + PostgreSQL API для MVP системы управления проектами.

## Скрипты

```bash
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

API: `http://localhost:3000/api`  
Swagger: `http://localhost:3000/docs`

## Демо-пользователи

| Роль | Email | Пароль |
|---|---|---|
| Администратор | admin@tasko.local | Password123! |
| Руководитель | manager@tasko.local | Password123! |
| Исполнитель | executor@tasko.local | Password123! |
