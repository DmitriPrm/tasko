# TASKO Frontend

Vue 3 SPA. Архитектура API повторяет `dreamteam-front`: ручки `createGet/Post`, вызов `baseApi`, запросы через `useFetch`.

```bash
npm install
npm run dev
```

Прокси `/api` → `http://localhost:3000`.

## Как добавлять ручку

1. Zod-схема в `src/shared/api/v0/schemas.ts`
2. `createGet/Post` в `src/shared/api/v0/<domain>`
3. Реэкспорт в `v0/index.ts`
4. В странице: `useFetch(baseApi.domain.method, "data", { immediate: true })`
