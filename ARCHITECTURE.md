# 🏎️ Sunny Rentals — Архитектура проекта

## 📂 Структура файлов

```
/root/tgbot/
├── webapp/                          # ⭐ Этот репозиторий (фронтенд + бэкенд для веба)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx            # 🌐 Клиентский фронтенд (витрина)
│   │   │   ├── AdminPanel.tsx       # Админ панель
│   │   │   ├── CRMPage.tsx          # CRM лиды (77 KB)
│   │   │   ├── CarsPage.tsx         # Управление автопарком (56 KB)
│   │   │   ├── AdminScheduler.tsx   # Календарь бронирований
│   │   │   ├── LoginPage.tsx        # Авторизация
│   │   │   └── Site.tsx             # Публичный сайт
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── CRM/             # Компоненты CRM
│   │   │   │   │   ├── LeadCard.tsx
│   │   │   │   │   ├── LeadDetailModal.tsx
│   │   │   │   │   └── BottomFilters.tsx
│   │   │   │   ├── SchedulerCalendar.tsx  # Gantt календарь
│   │   │   │   ├── MonthCalendarView.tsx  # Месячный вид
│   │   │   │   └── BookingFormDialog.tsx
│   │   │   └── ui/                  # UI kit (shadcn/ui)
│   │   ├── api/
│   │   │   └── api.ts               # API клиент
│   │   ├── types/
│   │   │   └── crm.ts               # TypeScript типы
│   │   ├── contexts/                # React Context
│   │   ├── hooks/                   # Кастомные хуки
│   │   └── locales/                 # Локализация
│   ├── backend/
│   │   ├── telegram_bot.py          # 🤖 Telegram бот (порт 5001)
│   │   └── web_integration.py       # 🌐 Web API (порт 5000)
│   ├── public/                      # Статические файлы
│   └── package.json                 # Зависимости (React + Vite)
│
└── backend/                         # Внешний бэкенд (отдельная папка на VPS)
    └── (FastAPI приложение)
```

---

## 🔗 Как работает система

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram Bot                             │
│                   /root/tgbot/webapp/backend/                   │
│                      telegram_bot.py (port 5001)                │
│                                                                 │
│  Клиент нажимает /start или кнопку в боте                       │
│         ↓                                                       │
│  Бот отвечает ссылкой на webapp                                │
│  https://sunny-rentals.online/app                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓ (клиент переходит по ссылке)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Web App (Frontend)                          │
│                  /root/tgbot/webapp/src/pages/                   │
│                                                                 │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────┐  │
│  │   Index.tsx    │    │  AdminPanel.tsx│    │ CRMPage.tsx  │  │
│  │  (Клиентская   │    │   (Админка)    │    │   (CRM)      │  │
│  │   витрина)     │    │                │    │              │  │
│  └────────────────┘    └────────────────┘    └──────────────┘  │
│                                                                 │
│  Клиент выбирает авто, даты → отправляет форму                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓ (REST API)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Web API                                     │
│                  /root/tgbot/webapp/backend/                    │
│                 web_integration.py (port 5000)                  │
│                                                                 │
│  Эндпоинты:                                                    │
│  POST /api/admin/bookings      # Создать/обновить бронь        │
│  GET  /api/cars                 # Список машин                  │
│  GET  /api/bookings             # Список броней                 │
│  GET  /api/bookings/logistics   # Логистика (пикапы/возвраты)  │
│  GET  /api/crm/users            # Лиды CRM                      │
│  POST /api/crm/message          # Сообщение в чате              │
│  POST /api/crm/update_marker    # Обновить маркер               │
│  POST /api/leads/track          # Трекинг лидов                 │
│                                                                 │
│  ⚠️  ВНИМАНИЕ: Claude AI интеграция встроена в этот файл       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                              ↓ (внутренние вызовы)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Внешний Backend                             │
│                   /root/tgbot/backend/ (FastAPI)                │
│                                                                 │
│  PostgreSQL база данных                                        │
│  Все бизнес-данные: пользователи, брони, машины                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Страницы (src/pages/)

| Страница | Файл | Назначение | Размер |
|----------|------|------------|--------|
| **Клиентская витрина** | `Index.tsx` | Выбор авто, калькулятор цен, форма брони | 19 KB |
| **CRM** | `CRMPage.tsx` | Лиды, чат, маркеры, управление менеджером | 77 KB |
| **Автопарк** | `CarsPage.tsx` | CRUD машин, владельцы, цены | 56 KB |
| **Календарь** | `AdminScheduler.tsx` | Гант/месяц, фильтры, создание броней | 11 KB |
| **Админка** | `AdminPanel.tsx` | Главная админки | 57 KB |
| **Логин** | `LoginPage.tsx` | Авторизация | 3 KB |

---

## 🔧 Ключевые компоненты

### CRM (`src/components/admin/CRM/`)
```
CRM/
├── LeadCard.tsx            # Карточка лида в списке
├── LeadDetailModal.tsx     # Детали + чат + действия
├── BottomFilters.tsx       # Фильтры (статус, маркеры, поиск)
└── StatusBar.tsx           # Строка с количеством лидов по статусам
```

### Календарь (`src/components/admin/`)
```
admin/
├── SchedulerCalendar.tsx   # Gantt-вид (строки машин, дни)
├── MonthCalendarView.tsx   # Месячный календарь (embla carousel)
├── DayDetailsModal.tsx     # Детали дня + создание броней
└── BookingFormDialog.tsx   # Форма создания/редактирования брони
```

---

## 📡 API (web_integration.py)

```python
# === БРОНИРОВАНИЯ ===
POST /api/admin/bookings    # Создать/обновить бронь
GET  /api/bookings          # Список броней
GET  /api/bookings/logistics # Пикапы и возвраты (для календаря)
DELETE /api/admin/bookings/{id} # Удалить бронь

# === АВТОПАРК ===
GET  /api/cars              # Список машин
GET  /api/available-cars    # Доступные на даты
POST /api/admin/cars        # Добавить машину
PUT  /api/admin/cars/{id}   # Обновить машину
GET  /api/car-owners        # Список владельцев

# === CRM ===
GET  /api/crm/users         # Лиды (фильтр по status, period)
GET  /api/crm/chats/{userId} # История чата
POST /api/crm/message       # Отправить сообщение
POST /api/crm/update_marker # Обновить маркер (+, $, -, ✓)
POST /api/crm/claude/toggle # Включить/выключить Claude AI
POST /api/crm/notes         # Добавить заметку

# === ЛИДЫ ===
POST /api/leads/track       # Трекинг событий
```

---

## 📊 Типы данных (src/types/crm.ts)

```typescript
// Лид в CRM
interface User {
  user_id: number;
  status: 'new' | 'interested' | 'in_work' | 'pending' | 'confirmed' | 'completed' | 'archive';
  marker?: 'unprocessed' | 'in_progress' | 'ready' | 'rejected';
  dialog_status: {
    active: boolean;
    has_new_messages: boolean;
    last_message_from: 'user' | 'manager' | 'claude';
    claude_status: 'active' | 'paused' | 'stopped';
    message_count: number;
  };
  car_interested?: string;
  dates_selected?: { start: string; end: string; days: number };
  notes: string[];
  last_note?: string;
}

// Бронь
interface Booking {
  booking_id: string;
  user_id: number;
  status: string;  // pending, confirmed, etc.
  source: 'telegram_webapp' | 'web_browser' | 'manager';
  form_data: {
    car: Car;
    dates: { start: string; end: string; days: number };
    locations: { pickupLocation: string; returnLocation: string };
    pricing: { grandTotal: number; deposit: number };
  };
}

// Машина
interface Car {
  id: string;
  name: string;
  class: 'compact' | 'sedan' | 'suv' | '7s' | 'bikes';
  brand: string;
  model: string;
  year: string;
  available: boolean;
  pricing: {
    low_season: { price_1_6: number; price_7_14: number; price_15_29: number; price_30: number };
    high_season: { ... };
    deposit: number;
  };
}
```

---

## 🛠 Технологический стек

| Компонент | Технология |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | React Query (@tanstack) |
| **Router** | React Router 6 |
| **Calendar** | date-fns + embla-carousel |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **Telegram Bot** | python-telegram-bot |
| **Web API** | Flask / FastAPI (web_integration.py) |

---

## 🔄 Потоки данных

### Клиент бронирует авто
```
Index.tsx (витрина)
    ↓ form submit
POST /api/admin/bookings
    ↓
web_integration.py
    ↓ сохраняет в БД
    ↓ возвращает booking_id
    ↓ отправляет уведомление менеджеру в CRM
```

### Менеджер обрабатывает лида
```
CRMPage.tsx
    ↓ fetchUsers(status='new')
GET /api/crm/users
    ↓
LeadDetailModal.tsx
    ↓ клик на лида
GET /api/crm/chats/{userId}
    ↓
Менеджер отправляет сообщение
    ↓
POST /api/crm/message
    ↓
Claude AI может автоматически отвечать (если claude_status='active')
```

### Календарь обновляется
```
AdminScheduler.tsx
    ↓ fetchBookings(), fetchBookingsLogistics()
GET /api/bookings + GET /api/bookings/logistics
    ↓
MonthCalendarView / SchedulerCalendar рендерят
```

---

## 📱 Адаптивность

- **Мобильная версия:** `daysToShow = 14` в календаре
- **Десктоп:** `daysToShow = 30`
- Брейкпоинт: `768px`

---

## 🚀 Запуск

```bash
# Frontend (из /root/tgbot/webapp)
cd /root/tgbot/webapp
npm install
npm run dev          # Vite dev server

# Telegram Bot (из /root/tgbot/webapp/backend)
cd /root/tgbot/webapp/backend
python telegram_bot.py --port 5001

# Web API (из /root/tgbot/webapp/backend)
cd /root/tgbot/webapp/backend
python web_integration.py --port 5000
```

---

## 📝 Порты

| Порт | Сервис | Файл | Назначение |
|------|--------|------|------------|
| 5000 | Web API | `web_integration.py` | REST API для фронтенда |
| 5001 | Telegram Bot | `telegram_bot.py` | Telegram бот (вход для клиентов) |
| 3000 | Vite Dev | `npm run dev` | Frontend dev server |

---

## ⚠️ Важные замечания

1. **Claude AI встроен в `web_integration.py`** — не отдельный сервис
2. **Два источника данных:** Telegram бот и веб-фронтенд
3. **API токен:** настраивается через `VITE_AUTH_TOKEN`
4. **Есть несколько версий CRM:** CRMPage(OLD).tsx, CRMPage_debug_fixes.tsx, CrmPage_new.tsx