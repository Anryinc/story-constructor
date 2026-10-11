# Деплой story-constructor

Код в git актуальный. Старые URL на Vercel часто крутят **замороженный** билд.
Лучше **удалить проект и создать заново**.

## Вариант A — Vercel с нуля (рекомендуется сейчас)

1. [vercel.com/dashboard](https://vercel.com/dashboard) → старый **story-constructor** (и **lagoon-valley-…**, если есть) → Settings → **Delete Project**.
2. **Add New… → Project** → Import GitHub **`Anryinc/story-constructor`**.
3. Framework: оставь auto / Other. **Root Directory:** `.`
4. Build Command: `npm run build` (по умолчанию).
5. Install: `npm install --omit=dev` (как в `vercel.json`) или просто default `npm install`.
6. Environment (опционально на старте):
   - `DATABASE_URL` — Neon Postgres, если есть (для `/api/rtc` signaling). Без него в проде будет PGLite на инстансе (на serverless хуже для мультиплеера).
7. **Deploy**.
8. Дождись статуса Ready. Открой выданный `*.vercel.app`.
9. В `<title>` должно быть **«Стол проектов»**, на главной — **«Активные сценарии»**.

Если Build Failed — Deployments → лог → пришли ошибку.

### Signaling (столы 2+ игрока)

Для WebRTC нужен общий backend с БД:

1. Создай бесплатный Neon: https://neon.tech  
2. Скопируй connection string → Vercel → Settings → Environment Variables → `DATABASE_URL`  
3. Redeploy.

Без `DATABASE_URL` одиночный UI откроется, mesh телефонов может не сходиться стабильно.

---

## Вариант B — Fly.io (always-on, лучше для 3–4 игроков)

Нужны: [fly.io](https://fly.io) аккаунт, CLI `flyctl`.

```bash
git clone https://github.com/Anryinc/story-constructor.git
cd story-constructor
fly auth login
fly apps create story-constructor   # имя свободно
fly secrets set DATABASE_URL="postgres://..."   # Neon или Fly Postgres
fly deploy
```

Сборка в Docker ставит `NITRO_PRESET=node_server`.

Файлы: `Dockerfile`, `fly.toml`.

---

## Как понять, что деплой новый

| Признак | Старый | Новый |
|---------|--------|-------|
| `<title>` | Червудский свидетель | Стол проектов |
| Главная | Одна кнопка стола | Сетка «Активные сценарии» |
| `/studio/cherwood` | 404 / старое | Мастерская + canvas |
