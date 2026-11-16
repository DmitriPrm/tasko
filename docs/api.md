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
- `GET /tasks/:id/prediction` — текущий прогноз (`forecast.source`: `ML` или `RULES`) и история пересчётов
- `POST /tasks/:id/prediction` — пересчитать прогноз; `refreshed: false`, если ML-сервис недоступен
- `DELETE /tasks/:id` — начатую задачу не удаляет, а переводит в `CANCELLED` (`{ cancelled: true }`)

## Other

- `GET /ml/status` — подключён ли ML-сервис и какие модели активны (алгоритм, метрики на тесте)
- `POST /ml/reload`, `POST /ml/recompute` — перечитать модели, пересчитать прогнозы открытых задач (право `SETTINGS_SYSTEM`)

## Settings

- `GET /settings/public` — без входа: пороги риска, ограничения файлов, вид проекта, правила регистрации
- `GET/PATCH /settings/system` — системные настройки по разделам `risk`, `deadlines`, `ml`, `registration`, `attachments`, `projects` (право `SETTINGS_SYSTEM`)
- `GET/PUT /settings/permissions` — права ролей
- `POST /settings/mail/test` — тестовое письмо себе
- `GET /settings/data/tasks.csv?projectId=` — задачи для Excel
- `GET /settings/data/ml-dataset.csv` — обезличенный набор для ML
- `GET /settings/data/audit?page&perPage&projectId&userId` — журнал действий
- `GET/PATCH /me/preferences` — личные настройки: уведомления, стартовая страница, вид проекта
- `POST /auth/change-password`, `POST /auth/logout-all` — смена пароля и выход на других устройствах (старые токены отзываются)

- `GET /dashboard`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /projects/:id/analytics/overview`
- `GET /projects/:id/analytics/workload`
- `GET /projects/:id/analytics/risks` — открытые задачи по уровню риска и сравнение плановой, прогнозной и фактической длительности последних 50 закрытых задач
