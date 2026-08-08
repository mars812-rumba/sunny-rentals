# Sunny Rentals — Архитектура проекта

## 📁 Структура проекта

```
sunny-rentals/
├── backend/
│   ├── telegram_bot.py          # Telegram бот (входная точка)
│   ├── web_integration.py       # FastAPI основной бэкенд
│   ├── admin_commands.py        # Admin команды
│   ├── data/
│   │   ├── bookings.json        # Брони
│   │   ├── user_data.json       # Клиенты/лиды
│   │   ├── car_owners.json      # Владельцы авто
│   │   └── chat_logs.jsonl      # Логи чатов
│   └── media/                   # Медиа файлы
├── src/
│   ├── pages/
│   │   ├── Index.tsx            # Витрина (sunny-rentals.online)
│   │   ├── CRMPage.tsx          # CRM для менеджеров
│   │   ├── AdminScheduler.tsx   # Админ календарь
│   │   ├── CarsPage.tsx         # Управление автопарком
│   │   └── LoginPage.tsx        # Авторизация
│   ├── components/
│   │   ├── SendBookForm.tsx     # ✅ Форма брони (клиент)
│   │   ├── admin/
│   │   │   ├── SchedulerCalendar.tsx  # Gantt диаграмма
│   │   │   ├── MonthCalendar.tsx      # Доставки/возвраты
│   │   │   └── BookingFormDialog.tsx  # Создание брони (админ)
│   │   └── site/                # Компоненты витрины
│   └── api/
│       └── api.ts               # API клиент
└── public/images_web/           # Фото авто
```

---

## 🔄 Потоки данных (3 источника брони)

### Источник 1: Telegram WebApp → SendBookForm.tsx
```
Пользователь в Telegram
        ↓
telegram_bot.py (кнопка "Арендовать")
        ↓
Открывается WebApp (Telegram Mini App)
        ↓
Index.tsx → SendBookForm.tsx
        ↓
POST /api/bookings/telegram_webapp
        ↓
web_integration.py → telegram_webapp_create_booking()
        ↓
bookings.json + user_data.json
```

**Эндпоинт:** `POST /api/bookings/telegram_webapp`
**Source:** `telegram_webapp`
**User ID:** `telegram_user`

### Автостарт Claude после открытия WebApp

```
Telegram WebApp открывается
        ↓
App.tsx → trackLeadEvent("webapp_opened") с проверенным initData
        ↓
POST /api/leads/track
        ↓
web_integration.py → POST /botapi/notify/webapp-opened
        ↓
telegram_bot.py → WebAppClaudeOutreachScheduler (15 минут)
        ↓
GET /api/claude/status/{user_id}
        ↓
POST /api/claude/start/{user_id} → первое сообщение Claude
```

Правила защиты от повторных и неуместных сообщений:

- таймер создаётся только для подтверждённого числового Telegram `user_id`;
- администратор исключён из автоматического запуска;
- повторное открытие WebApp заменяет предыдущий таймер;
- сообщение клиента или отправка брони отменяют ожидающий запуск;
- перед стартом повторно проверяются `claude_status`, число сообщений и наличие брони;
- при недоступном статусе запуск не выполняется;
- базовая задержка — 900 секунд; для тестового окружения её можно переопределить
  переменной `CLAUDE_WEBAPP_INIT_DELAY_SECONDS`.

---

### Источник 2: Admin Scheduler → BookingFormDialog.tsx
```
Менеджер в AdminScheduler.tsx
        ↓
BookingFormDialog.tsx / BookingModal.tsx
        ↓
POST /api/admin/bookings
        ↓
web_integration.py → admin_create_booking()
        ↓
bookings.json + user_data.json
```

**Эндпоинт:** `POST /api/admin/bookings`
**Source:** `admin_panel`
**User ID:** `admin`

---

### Источник 3: sunny-rentals.online → Index.tsx
```
Клиент на сайте sunny-rentals.online
        ↓
Index.tsx → SendBookForm.tsx
        ↓
POST /api/bookings/web-create
        ↓
web_integration.py → web_create_booking()
        ↓
bookings.json + user_data.json
```

**Эндпоинт:** `POST /api/bookings/web-create`
**Source:** `web_frontend`
**User ID:** `web_user`

---

## 📊 Модели данных (Pydantic)

### Booking (бронирование)
```typescript
interface Booking {
  booking_id: string;           // "bk_1700000000"
  user_id: string;              // Telegram ID или "admin" или "web_user"
  form_data: {
    car: {
      id: string;               // "Toyota_Veloz_2024"
      name: string;
      brand: string;
      model: string;
      year: string;
      color: string;
    };
    dates: {
      start: string;            // ISO date
      end: string;
      days: number;
    };
    locations: {
      pickupLocation: string;   // "airport" | "hotel" | "villa"
      returnLocation: string;
      pickupAddress?: string;
      returnAddress?: string;
    };
    pricing: {
      dailyRate: number;
      totalRental: number;
      deposit: number;
      deliveryPickup: number;
      deliveryReturn: number;
      totalDelivery: number;
      grandTotal: number;
    };
    contact: {
      value: string;            // WhatsApp или @username
      type: "whatsapp" | "telegram";
      name?: string;
      phone?: string;
    };
    timestamp: string;
  };
  status: "new" | "pre_booking" | "confirmed" | "cancelled";
  source: "telegram_webapp" | "admin" | "web_frontend";
  created_at: string;
  updated_at?: string;
  confirmed_at?: string;
}
```

### UserData (клиент/лид)
```typescript
interface UserData {
  user_id: string;              // Telegram ID
  username?: string;
  created_at: string;
  updated_at?: string;
  status: "new" | "interested" | "in_work" | "pending" | "archived";
  final_status: string;         // Для сортировки в CRM
  form_started: boolean;
  booking_submitted: boolean;
  car_interested?: string;
  category_interested?: string;
  dates_selected?: {
    start: string;
    end: string;
    days: number;
  };
  notes: Array<{
    note_id: string;
    text: string;
    timestamp: string;
    action?: string;
  }>;
  source: "telegram" | "web" | "restored";
  marker: "ready" | "in_progress" | "selling" | "refuse" | null;
  last_note?: string;
  dialog_status?: {
    active: boolean;
    has_new_messages: boolean;
    last_message_from: "user" | "manager" | "claude";
    message_count: number;
  };
}
```

---

## 🎯 Статусы брони

| Статус | Описание | Откуда приходит |
|--------|----------|-----------------|
| `new` | Новая заявка | Клиент отправил форму |
| `pre_booking` | Предварительная бронь | После создания, ждёт подтверждения |
| `confirmed` | Подтверждённая бронь | Менеджер подтвердил |
| `cancelled` | Отменена | Клиент или менеджер отменил |

**Важно:** Все брони создаются со статусом `pre_booking`

---

## 🏷️ Маркеры лидов (CRM)

| Маркер | Описание | Цвет |
|--------|----------|------|
| `ready` | Готов к сделке | Зелёный |
| `in_progress` | В процессе | Синий |
| `selling` | На этапе продажи | Оранжевый |
| `refuse` | Отказ | Красный |
| `null` | Без маркера | Серый |

---

## 📡 API Эндпоинты (web_integration.py)

### Бронирования

| Метод | Endpoint | Source | Описание |
|-------|----------|--------|----------|
| POST | `/api/bookings/telegram_webapp` | telegram_webapp | Создать бронь из Telegram WebApp |
| POST | `/api/bookings/web-create` | web_frontend | Создать бронь с сайта |
| POST | `/api/admin/bookings` | admin_panel | Создать бронь из админки |
| GET | `/api/bookings` | - | Получить все брони |
| GET | `/api/bookings/{booking_id}` | - | Получить бронь по ID |
| GET | `/api/bookings/logistics` | - | Логистика (доставки/возвраты) |
| POST | `/api/admin/bookings/{id}/confirm` | - | Подтвердить бронь |

### Клиенты/Лиды

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/leads` | Получить лидов |
| POST | `/api/lead-track` | Отслеживание событий |
| PATCH | `/api/admin/user/{id}/status` | Обновить статус |
| PATCH | `/api/admin/user/{id}/marker` | Установить маркер |
| POST | `/api/admin/user/{id}/note` | Добавить заметку |

### Автопарк

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/cars` | Получить авто |
| POST | `/api/admin/cars` | Добавить авто |
| PUT | `/api/admin/cars/{id}` | Обновить авто |
| DELETE | `/api/admin/cars/{id}` | Удалить авто |

---

## 🔗 Связи Frontend → Backend

```
SendBookForm.tsx
    ↓
    submitBooking(formData, bookingId, 'web'|'telegram')
    ↓
api.ts → POST /api/bookings/web-create | POST /api/bookings/telegram_webapp
    ↓
web_integration.py → web_create_booking() | telegram_webapp_create_booking()
    ↓
bookings.json + user_data.json
```

```
CRMPage.tsx
    ↓
    fetchLeads(), updateStatus(), addNote()
    ↓
api.ts → GET /api/leads, PATCH /api/admin/user/{id}/status
    ↓
web_integration.py → get_leads(), update_user_status()
    ↓
user_data.json
```

```
AdminScheduler.tsx
    ↓
    fetchBookings(), fetchCars(), createBooking()
    ↓
api.ts → GET /api/bookings, GET /api/cars, POST /api/admin/bookings
    ↓
web_integration.py → list_bookings(), admin_create_booking()
    ↓
bookings.json + web_cars.json
```

---

## ⚠️ Потенциальные конфликты и баги

### 1. SendBookForm.tsx — НЕПРАВИЛЬНЫЙ SOURCE при бронировании из Telegram

**Проблема (🔴 КРИТИЧЕСКИЙ БАГ):**
```typescript
// SendBookForm.tsx:266
await submitBooking(formData, newBookingId);  // ❌ bookingSource не передан!
// По умолчанию использует 'web', даже если пользователь в Telegram!
```

**Симптомы:**
- Брони из Telegram WebApp помечаются как `source: "web_frontend"` вместо `source: "telegram_webapp"`
- User ID = `"web_user"` вместо реального Telegram ID
- Путаница в аналитике источников

**Решение:**
```typescript
// SendBookForm.tsx → handleBookingSubmit()
const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
const bookingSource = isTelegram ? 'telegram' : 'web';

await submitBooking(formData, newBookingId, bookingSource);
```

---

### 2. LeadTrack vs SendBookForm

**Проблема:** LeadTrack может обрабатывать данные параллельно с созданием брони.

**Решение:** Проверить порядок вызова и гарантировать идемпотентность.

---

### 3. Overlap проверка (pre_booking)

**Проблема:** `pre_booking` не блокирует слоты при проверке:
```python
# web_integration.py
if booking.get('status') == 'pre_booking':
    continue  # ❌ Игнорируем pre_booking
```

**Решение:** Проверить бизнес-логику — должны ли `pre_booking` учитываться.

---

### 3. Статусы лидов
```typescript
// CRMPage.tsx
const STATUS_CONFIG = {
  'new': 'Холодные',
  'interested': 'Теплые',
  'in_work': 'В работе',
  'pending': 'Заявки',
  'confirmed': 'Бронь',
  // ...
};
```

**Проверить:** `status` vs `final_status` — как они используются и не противоречат ли друг другу.

---

## 📋 Файлы для проверки

1. ✅ **`src/components/SendBookForm.tsx`** — БАГ: не передаёт bookingSource
2. ⬜ **`src/pages/Index.tsx`** — дублирование логики с SendBookForm
3. ⬜ **`web_integration.py:check_booking_overlap()`** — логика `pre_booking`
4. ⬜ **`api.ts`** — все вызовы эндпоинтов
5. ⬜ **`user_data.json`** — структура маркеров

---

## 🚀 Следующие шаги

1. ✅ Создать этот документ
2. ✅ **ИСПРАВИТЬ SendBookForm.tsx** — передавать `bookingSource` в `submitBooking`
3. ⬜ Валидировать эндпоинты в web_integration.py
4. ⬜ Проверить бизнес-логику `pre_booking` overlap
5. ⬜ Унифицировать названия источников (telegram_webapp / web_frontend)
