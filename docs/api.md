# API

Базовый URL: `/api`  
Swagger: `http://localhost:3000/docs`

Ответ успеха: `{ "data": ... }`  
Ошибка: `{ "error": { "message": "...", "code": 400 } }`

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

## Users

- `GET /users`
- `GET /users/directory`
- `POST /users` (ADMIN)
- `PATCH /users/:id` (ADMIN)

## Projects

- `GET/POST /projects`
- `GET/PATCH /projects/:id`
- `POST /projects/:id/archive`
- `GET/POST /projects/:id/members`
- `DELETE /projects/:id/members/:userId`

## Tasks

- `GET /tasks`
- `GET/POST /projects/:id/tasks`
- `GET/PATCH /tasks/:id`
- `POST /tasks/:id/transitions`
- `GET /tasks/:id/history`
- `GET/POST /tasks/:id/comments`
- `GET /tasks/:id/subtasks` (создание — `POST /projects/:id/tasks` с `parentTaskId`)
- `GET/POST /tasks/:id/dependencies` — `{ taskId, kind: DEPENDS_ON | BLOCKS | RELATED }`
- `DELETE /tasks/:id/dependencies/:dependencyId`
- `GET/POST /tasks/:id/attachments` (multipart, поле `file`)
- `GET /tasks/:id/attachments/:attachmentId/download`
- `DELETE /tasks/:id/attachments/:attachmentId`
- `DELETE /tasks/:id` — начатую задачу не удаляет, а переводит в `CANCELLED` (`{ cancelled: true }`)

## Other

- `GET /dashboard`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /projects/:id/analytics/overview`
- `GET /projects/:id/analytics/workload`
