# Sunny Rentals — Полная документация проекта

> **ВАЖНО:** Читай этот файл ПЕРЕД началом каждой новой сессии!

---

## 0. О проекте

### История создания
Создано из "боли" — когда Марсель занимался арендой авто на Пхукете, был overwhelmed лидами (100+/день) и обрабатывал только ~20%. 

**Проблема:**
- Лиды уходили к конкурентам
- Менеджер зашивался
- Потерянные деньги

**Решение:** Система, которая:
1. Автоматически обрабатывает ВЕСЬ поток лидов
2. AI ведёт диалоги и "продаёт" самостоятельно
3. Единый интерфейс для менеджера

### Бизнес-модель
- **Ниша:** Аренда авто на Пхукете (туристический рынок)
- **Каналы:** Telegram, сайт, мини-апп
- **Автоматизация:** AI отвечает, отправляет фото, оформляет бронь
- **Конверсия:** 20% → 100% обработанных лидов

### Цели системы
1. **Обработка 100% лидов** — никто не должен уйти без ответа
2. **AI-ассистент** — ведёт диалоги, отвечает на вопросы, отправляет фото
3. **Закрытие сделок** — AI предлагает офферы и оформляет бронь
4. **Один интерфейс** — менеджер работает в CRM без переключений

---

## 1. Контакты и доступы

| Сервис | URL | Логин/Токен |
|--------|-----|-------------|
| **Сайт (фронтенд)** | https://sunny-rentals.online | — |
| **API (бэкенд)** | https://sunny-rentals.online/api | — |
| **Telegram Бот** | @sunny_rentals_bot | Webhook настроен |
| **Git Репозиторий** | github.com/Marseloid/sunny-rentals | Токен в `~/.netrc` или `gh auth` |
| **Рабочая ветка** | `marsel-collab` | **НЕ коммитить в main!** |

---

## 2. Архитектура проекта

```
sunny-rentals/
├── backend/                      # FastAPI + Python
│   ├── web_integration.py        # Главный API сервер (все эндпоинты)
│   │   ├── PORT: 8000
│   │   ├── API_PREFIX: "/api"
│   │   └── Swagger: /api/docs
│   ├── telegram_bot.py           # Telegram Webhook бот
│   ├── admin_commands.py         # Admin команды
│   ├── data/                     # JSON "база данных"
│   │   ├── bookings.json         # Все бронирования
│   │   ├── users.json            # Пользователи/лиды
│   │   ├── cars.json             # Автомобили
│   │   └── chat_logs.jsonl       # Логи чатов
│   └── media/                    # Медиафайлы
│
├── src/                          # React + TypeScript (Vite)
│   ├── pages/
│   │   ├── Index.tsx             # Главная (sunny-rentals.online)
│   │   ├── CarsPage.tsx          # Каталог авто + админ
│   │   ├── OfferAdminPage.tsx    # Создание оффера (админ)
│   │   ├── OfferPage.tsx         # Страница оффера (клиент)
│   │   ├── CRMPage.tsx           # CRM (лиды, чаты)
│   │   ├── AdminScheduler.tsx    # Календарь броней
│   │   └── AdminApp.tsx          # Главная админки (табы)
│   ├── api/
│   │   └── api.ts                # API клиент
│   └── components/
│       └── ui/                   # UI компоненты (shadcn/ui)
│
└── deploy/
    └── nginx.conf                # Nginx конфиг
```

---

## 3. Сущности (Data Models)

### User (Пользователь/Лид)
```json
{
  "user_id": "123456789",
  "username": "@marseloid",
  "full_name": "Марсель",
  "phone": "+79123456789",
  "status": "new | pre_booking | confirmed",
  "car_interested": "car_id",
  "notes": ["позвонил", "интересуется Toyota Veloz"],
  "created_at": "2026-02-06T15:02:43Z",
  "updated_at": "2026-02-06T15:34:19Z"
}
```

### Car (Автомобиль)
```json
{
  "id": "toyota_ativ_2024_gray",
  "name": "Toyota Ativ 2024 Gray",
  "brand": "Toyota",
  "model": "Ativ",
  "year": "2024",
  "color": "gray",
  "price_1_6": 1100,
  "price_7_14": 1000,
  "price_15_29": 900,
  "price_30": 800,
  "deposit": 5000,
  "available": true,
  "photos": {
    "main": "toyota_ativ_2024_gray/main.jpg",
    "gallery": ["toyota_ativ_2024_gray/1.jpg"]
  }
}
```

### Booking (Бронь)
```json
{
  "booking_id": "4c8c5322",
  "user_id": "123456789",
  "status": "pre_booking | confirmed | rejected",
  "form_data": {
    "car": {
      "id": "Ar_veloz_gray_2024",
      "name": "Toyota Veloz 2024 Gray",
      "brand": "Toyota",
      "model": "Veloz",
      "year": "2024",
      "color": ""
    },
    "dates": {
      "start": "2026-03-07T05:00:00Z",
      "end": "2026-03-16T06:00:00Z",
      "days": 10
    },
    "locations": {
      "pickupLocation": "hotel",
      "returnLocation": "hotel",
      "pickupAddress": "Chana Phuket",
      "returnAddress": "Chana Phuket"
    },
    "pricing": {
      "dailyRate": 1258,
      "totalRental": 12580,
      "deposit": 10000,
      "deliveryPickup": 500,
      "deliveryReturn": 500,
      "totalDelivery": 1000,
      "grandTotal": 13580
    },
    "contact": {
      "value": "+79123456789",
      "type": "whatsapp",
      "name": "Михаил"
    },
    "timestamp": "2026-02-06T15:34:19Z"
  },
  "source": "admin_panel | offer_page",
  "created_at": "2026-02-06T15:02:43Z",
  "updated_at": "2026-02-06T15:34:19Z"
}
```

---

## 4. API Endpoints

### Бронирования
| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/bookings/offer-create` | Создать бронь из оффера |
| `GET` | `/api/bookings/list` | Список всех броней |
| `GET` | `/api/bookings/user/{user_id}` | Брони пользователя |
| `POST` | `/api/bookings/confirm` | Подтвердить бронь |
| `POST` | `/api/bookings/reject` | Отклонить бронь |

### Пользователи
| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/users/list` | Список пользователей |
| `GET` | `/api/users/{user_id}` | Пользователь по ID |
| `POST` | `/api/users/update-status` | Обновить статус |

### Автомобили
| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/api/cars` | Список всех авто |
| `GET` | `/api/cars/{car_id}` | Авто по ID |
| `POST` | `/api/cars/add` | Добавить авто |
| `POST` | `/api/cars/update` | Обновить авто |

### Offer Flow
| Метод | Endpoint | Описание |
|-------|----------|----------|
| `POST` | `/api/bookings/offer-create` | Создать бронь из оффера |
| `GET` | `/api/cars/{car_id}` | Получить данные авто |

---

## 5. Workflow: Создание оффера

### Полный путь (клиент заказывает авто):

```
1. CRM (Admin) → Выбирает лида → "Создать оффер"
   └─→ dispatchEvent('switchTab', { tab: 0, userId })

2. AdminApp → Перехватывает событие → Переключает на таб 0 (CarsPage)
   └─→ setTargetUserId(userId)

3. CarsPage → Показывает каталог → Кликает "Предложение" на авто
   └─→ navigate(`/admin/offer?car={car_id}&user_id={user_id}...`)

4. OfferAdminPage → Админ видит калькулятор → Кликает "Диплинк"
   └─→ navigator.clipboard.writeText(url с user_id)

5. Клиент → Открывает ссылку https://sunny-rentals.online/offer?...
   └─→ Видит OfferPage

6. OfferPage → Клиент нажимает "Забронировать"
   └─→ POST /api/bookings/offer-create

7. Backend → Создаёт бронь + обновляет статус лида
   └─→ Возвращает { status: "ok", booking_id }
```

### URL параметры OfferPage:
```
/offer?car={car_id}
      &start={yyyy-MM-dd}
      &end={yyyy-MM-dd}
      &rental={total_rental}
      &delivery={total_delivery}
      &deposit={deposit}
      &user_id={telegram_id}
      &pickup={location}
      &return={location}
```

---

## 6. Текущее состояние (2026-03-06)

✅ **Реализовано:**
- ✅ AI-ассистент для обработки лидов (prompts.yaml)
- ✅ CRM с чатами и лидами
- ✅ Offer flow (CRM → Cars → Offer → Booking)
- ✅ Telegram Mini App
- ✅ Защита от дубликатов броней
- ✅ Попап успеха при бронировании
- ✅ User_id передаётся через всю цепочку

### Модули системы:
| Модуль | Статус | Описание |
|--------|--------|----------|
| CRM | ✅ Готова | Лиды, чаты, история |
| AI Assistant | ✅ Готова | Ве диалоги, отвечает, продаёт |
| Offer Flow | ✅ Готова | Создание офферов, диплинки |
| Календарь | ✅ Готова | Просмотр броней |
| Admin Panel | ✅ Готова | Управление автопарком |

⏳ **В работе:**
- (Система стабильна, жду новых задач)

---

## Roadmap

### Актуальный продуктовый план

Приоритет разработки зафиксирован в [`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md):

1. наполнить статический RU/EN-сайт, карточки и посадочные страницы;
2. довести `sitemap.xml`, `robots.txt`, canonical, `hreflang` и `noindex` до production-уровня;
3. после индексации реализовать Telegram-уведомления о бронях;
4. затем добавить личный кабинет в Telegram WebApp и перейти с JSON на базу данных.

Подробный согласованный план внедрения публичного сайта и SEO зафиксирован в
[`docs/sunny-rentals-plan-vnedreniya.md`](docs/sunny-rentals-plan-vnedreniya.md).
Он объединяет исследования конкурентов, позиционирование, SEO-контент и требования
к каталогу. Текущий первый шаг — единый контракт достоверных данных автомобиля;
после него выполняются техническое SEO, главная, каталог, страницы автомобилей и
первая волна статичного RU/EN-контента.

Фактически реализованное состояние этапов 0–7, подтвержденные коммерческие условия,
состав sitemap и результаты проверок зафиксированы в
[`docs/sunny-rentals-etapy-0-7-itogi.md`](docs/sunny-rentals-etapy-0-7-itogi.md).

Следующие исторические этапы сохранены ниже как контекст, но текущий порядок работ определяется продуктовым roadmap.

### Этап 1: Баги и доработки (СКОРО)
- [ ] Составить список багов от Марселя
- [ ] Исправить все баги за 1 день
- [ ] Тестирование

### Этап 2: Multi-tenant (субдомены)
- [ ] Вынести bot token в конфиг
- [ ] Структура данных: data/{park_id}/
- [ ] Роутинг по subdomain
- [ ] Админка для управления парками
- [ ] Trial period
- [ ] Демо кабинет

---

*Исторический roadmap обновлен: 2026-03-06*

---

## 7. Команды для разработки

```bash
# Переход в проект
cd /home/openclawbot/clawd/sunny-rentals

# Dev сервер (фронтенд)
npm run dev

# Production билд
npm run build

# Запуск бэкенда (из backend/)
cd backend
python web_integration.py

# Git
git add -A && git commit -m "сообщение" && git push origin marsel-collab
```

---

## 8. Особенности работы

### AI (Искусственный интеллект)
- **Файл промптов:** `backend/prompts.yaml`
- **Функции AI:**
  - Отвечает на вопросы клиентов
  - Отправляет фото автомобилей
  - Формирует офферы
  - Оформляет бронь
  - Ве диалог до закрытия сделки
- **Подключение:** Единый источник правды (все данные из системы)
- **Статус:** ✅ Работает корректно

### Telegram Web App
- **Mini App:** https://sunny-rentals.online/admin
- **Вебхук:** настроен на `/telegram/webhook`

### Voice (голосовые)
- **Whisper API:** ключ в `/home/openclawbot/clawd/.env/OPENAI_API_KEY`
- **TTS:** OpenAI TTS-1, голос alloy

### Защита от дублей
При `POST /api/bookings/offer-create` проверяется:
- Есть ли активная бронь у пользователя
- На тот же автомобиль
- С пересекающимися датами

---

## 9. Как ставить задачи

**Хорошо:**
- "Добавь кнопку X в компонент Y"
- "Почини баг: при нажатии Z происходит W"
- "Реализуй фичу: ..."

**Лучше:**
- "Нужно чтобы при X выполнялось Y"
- "Проблема: Z, ожидаю: W"

---

## 10. Память и контекст

| Файл | Что хранит |
|------|------------|
| `MEMORY.md` | Долгосрочная память (секреты, важное) |
| `memory/YYYY-MM-DD.md` | Дневные заметки |
| `GUIDE.md` | Руководство по работе со мной |
| `PROJECT.md` | Этот файл — полная картина проекта |

---

*Обновлено: 2026-07-31*
