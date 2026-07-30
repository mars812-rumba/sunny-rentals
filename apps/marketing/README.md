# Sunny Rentals Marketing

Изолированное Next.js-приложение для публичных SEO-страниц Sunny Rentals.

## Границы приложения

Next.js будет обслуживать:

- `/`
- `/cars/*`
- `/locations/*`
- `/blog/*`
- `/offers/*`

Текущий Vite SPA продолжает обслуживать:

- `/app`
- `/admin/*`
- `/dashboard/*`
- `/offer`
- `/assets/*` на время перехода

FastAPI продолжает обслуживать `/api/*`, `/botapi/*`, `/web_images/*`,
Telegram webhook и медиа.

Текущая Vite-сборка загружает JavaScript и стили из `/assets/*`. Этот маршрут
нужно направлять в legacy frontend, пока для Vite не настроен отдельный base
path. Иначе после переключения перестанет загружаться WebApp.

До этапа переключения reverse proxy это приложение не влияет на production.

## Локальный запуск

```bash
npm install
npm run dev
```

Production-проверка:

```bash
npm run build
npm run start
```

## Каталог и бронирование

- Маркетинговые данные моделей находятся в `src/content/cars.ts`.
- `/cars` показывает все пять категорий по четыре модели.
- `/cars/[slug]` генерируется статически и содержит индивидуальные metadata,
  canonical, Open Graph и JSON-LD.
- Фотографии остаются на существующем маршруте `/images_web/*`.
- CTA формирует `sr2_<category>_<inventory_id>` и передаёт выбранную машину в
  Telegram-бот. WebApp открывает нужную категорию, прокручивает к автомобилю и
  сохраняет интерес в CRM.
